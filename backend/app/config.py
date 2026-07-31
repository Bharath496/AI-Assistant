from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache
from pathlib import Path
from typing import List


class Settings(BaseSettings):
    # Core
    app_name: str = "AI ASS"
    debug: bool = False
    
    # LLM Configuration
    llm_provider: str = "huggingface"  # claude, openai, ollama, huggingface
    llm_model: str = "Qwen/Qwen2.5-7B-Instruct"
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    anthropic_api_key: str = ""
    anthropic_base_url: str = "https://api.anthropic.com"
    ollama_base_url: str = "http://localhost:11434"
    huggingface_api_key: str = ""
    huggingface_model: str = "Qwen/Qwen2.5-7B-Instruct"
    huggingface_base_url: str = "https://router.huggingface.co/v1"
    
    # Memory
    sqlite_db_path: str = "./data/memory.db"
    embeddings_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    
    # Tools
    tavily_api_key: str = ""
    google_api_key: str = ""
    google_calendar_id: str = ""
    notion_api_key: str = ""
    notion_database_id: str = ""
    
    # API
    api_host: str = "127.0.0.1"
    api_port: int = 8000
    api_reload: bool = True
    
    # CORS
    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:8000", "http://127.0.0.1:8000", "https://aiass-akx.pages.dev"]
    
    # Frontend
    frontend_url: str = "http://localhost:3000"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug_flag(cls, value):
        """
        Accept common shell values like DEBUG=release without failing startup.
        """
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "prod", "production", "false", "0", "no", "off"}:
                return False
            if normalized in {"debug", "true", "1", "yes", "on"}:
                return True
        return value


@lru_cache()
def get_settings() -> Settings:
    return Settings()
