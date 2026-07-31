#!/usr/bin/env python3
"""
Verify that AI ASS is properly configured with Hugging Face.
"""

import requests
import json
from pathlib import Path

print("\n" + "="*50)
print(" AI ASS + Hugging Face Verification")
print("="*50 + "\n")

# 1. Check .env configuration
print("[1/4] Checking configuration...")
env_path = Path("backend/.env")
if not env_path.exists():
    print("  ❌ .env file not found")
else:
    with open(env_path) as f:
        content = f.read()
        if "huggingface" in content.lower():
            print("  ✓ Hugging Face configured in .env")
        else:
            print("  ⚠ HF not configured in .env (check LLM_PROVIDER)")
        if "HUGGINGFACE_API_KEY=" in content:
            print("  ✓ HUGGINGFACE_API_KEY present")
        else:
            print("  ❌ HUGGINGFACE_API_KEY missing")

# 2. Check backend API
print("\n[2/4] Checking backend API...")
try:
    response = requests.get("http://127.0.0.1:8000/api/health", timeout=2)
    if response.status_code == 200:
        print("  ✓ Backend is running on 127.0.0.1:8000")
    else:
        print(f"  ❌ Backend returned status {response.status_code}")
except requests.exceptions.ConnectionError:
    print("  ❌ Cannot connect to backend")
    print("     Start backend: cd backend && python main.py")
except Exception as e:
    print(f"  ❌ Error: {e}")

# 3. Test chat endpoint (real Hugging Face inference)
print("\n[3/4] Testing chat API with Hugging Face...")
try:
    response = requests.post(
        "http://127.0.0.1:8000/api/chat",
        json={
            "messages": [{"role": "user", "content": "Hello"}],
            "system_prompt": "You are a helpful AI assistant."
        },
        timeout=120
    )
    if response.status_code == 200:
        data = response.json()
        text = data.get('response', 'No response')
        if text.startswith("Hugging Face error"):
            print(f"  ❌ {text}")
        else:
            print("  ✓ Chat API works via Hugging Face")
            print(f"  ✓ Response: {text[:60]}...")
    else:
        print(f"  ❌ Chat API returned status {response.status_code}")
except requests.exceptions.Timeout:
    print("  ⚠ Chat API timed out (HF inference may be slow on first call)")
except requests.exceptions.ConnectionError:
    print("  ❌ Cannot connect to backend")
except Exception as e:
    print(f"  ❌ Error: {e}")

# 4. Test live web search
print("\n[4/4] Testing live web search...")
try:
    response = requests.post(
        "http://127.0.0.1:8000/api/search",
        json={"tool_name": "web_search", "kwargs": {"query": "today's news", "max_results": 2}},
        timeout=30
    )
    if response.status_code == 200:
        data = response.json()
        results = data.get("results", [])
        print(f"  ✓ Web search returned {len(results)} live results")
    else:
        print(f"  ❌ Web search returned status {response.status_code}")
except Exception as e:
    print(f"  ❌ Error: {e}")

print("\n" + "="*50)
print(" Setup Summary")
print("="*50)
print("""
AI ASS by BHARATH K (B.Sc AIML) is ready.

1. Start backend:
   cd backend
   python main.py

2. Open in browser:
   http://127.0.0.1:8000

3. Model: Hugging Face Qwen/Qwen2.5-7B-Instruct (free serverless inference)
   - Set HUGGINGFACE_API_KEY in backend/.env (get one free at huggingface.co/settings/tokens)
   - Live web search is automatic and needs no API key

For more info, see README.md
""")
print("="*50 + "\n")
