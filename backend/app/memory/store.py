"""
Simple SQLite-based memory store for conversation history and user facts.
Supports both short-term (conversation) and long-term (facts) storage.
Uses Python's built-in sqlite3 module.
"""

import sqlite3
import json
import numpy as np
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
import os


class MemoryStore:
    def __init__(self, db_path: str = "./data/memory.db"):
        """Initialize SQLite memory store."""
        self.db_path = db_path
        # Create data directory if it doesn't exist
        db_dir = os.path.dirname(db_path) or "."
        os.makedirs(db_dir, exist_ok=True)
        self.init_db()
    
    def init_db(self):
        """Create tables if they don't exist."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Conversation history
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Messages
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id)
            )
        """)
        
        # User facts/knowledge
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS facts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE NOT NULL,
                value TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        conn.close()
    
    def add_message(self, conversation_id: str, role: str, content: str):
        """Add a message to conversation history."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create conversation if doesn't exist
        cursor.execute(
            "INSERT OR IGNORE INTO conversations (conversation_id) VALUES (?)",
            (conversation_id,)
        )
        
        cursor.execute(
            "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
            (conversation_id, role, content)
        )
        
        conn.commit()
        conn.close()
    
    def get_conversation_history(self, conversation_id: str, limit: int = 50) -> List[Dict[str, str]]:
        """Get conversation history, most recent first."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute(
            """
            SELECT role, content FROM messages 
            WHERE conversation_id = ? 
            ORDER BY timestamp DESC 
            LIMIT ?
            """,
            (conversation_id, limit)
        )
        
        messages = [
            {"role": row[0], "content": row[1]}
            for row in reversed(cursor.fetchall())
        ]
        
        conn.close()
        return messages
    
    def set_fact(self, key: str, value: Any):
        """Store a user fact/preference."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        value_str = json.dumps(value) if not isinstance(value, str) else value
        
        cursor.execute(
            """
            INSERT OR REPLACE INTO facts (key, value, updated_at) 
            VALUES (?, ?, CURRENT_TIMESTAMP)
            """,
            (key, value_str)
        )
        
        conn.commit()
        conn.close()
    
    def get_fact(self, key: str) -> Optional[Any]:
        """Retrieve a user fact."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT value FROM facts WHERE key = ?", (key,))
        result = cursor.fetchone()
        conn.close()
        
        if result:
            try:
                return json.loads(result[0])
            except json.JSONDecodeError:
                return result[0]
        return None
    
    def get_all_facts(self) -> Dict[str, Any]:
        """Get all user facts."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT key, value FROM facts")
        facts = {}
        for key, value in cursor.fetchall():
            try:
                facts[key] = json.loads(value)
            except json.JSONDecodeError:
                facts[key] = value
        
        conn.close()
        return facts
    
    def clear_conversation(self, conversation_id: str):
        """Delete a conversation."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM messages WHERE conversation_id = ?", (conversation_id,))
        cursor.execute("DELETE FROM conversations WHERE conversation_id = ?", (conversation_id,))
        
        conn.commit()
        conn.close()
    
    def embed_text(self, text: str) -> Optional[List[float]]:
        """Generate embedding vector for text using sentence-transformers."""
        try:
            from sentence_transformers import SentenceTransformer
            model = SentenceTransformer('all-MiniLM-L6-v2')
            return model.encode(text).tolist()
        except ImportError:
            return None
    
    def semantic_search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Search messages semantically using embedding similarity."""
        query_vec = self.embed_text(query)
        if query_vec is None:
            return []
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT role, content, timestamp FROM messages ORDER BY timestamp DESC LIMIT 200"
        )
        rows = cursor.fetchall()
        conn.close()
        
        if not rows:
            return []
        
        results = []
        for role, content, ts in rows:
            content_vec = self.embed_text(content)
            if content_vec is None:
                continue
            sim = np.dot(query_vec, content_vec) / (
                np.linalg.norm(query_vec) * np.linalg.norm(content_vec) + 1e-8
            )
            results.append((sim, {"role": role, "content": content, "timestamp": ts}))
        
        results.sort(key=lambda x: x[0], reverse=True)
        return [r[1] for r in results[:top_k] if r[0] > 0.3]
