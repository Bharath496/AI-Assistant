# Quick Start - AI ASS

## ✅ Status: Fully Operational (Hugging Face)

Your personal AI assistant — **AI ASS by BHARATH K (B.Sc AIML)** — is up and running!

**Backend**: Running on http://127.0.0.1:8000
**Frontend**: Available at the same URL (web interface) or Electron desktop app
**Model**: Hugging Face `Qwen/Qwen2.5-7B-Instruct` (free serverless inference, no install)
**Knowledge**: LIVE — automatic web search keeps answers current

---

## 🎯 What's Working

✅ Real AI responses via Hugging Face (free token, no local install)
✅ **Live web search** — news, elections, prices, leaders — always current (Wikipedia + Google News, no API key)
✅ Chat interface with markdown rendering & copy buttons
✅ Conversation memory (SQLite database)
✅ Semantic search across past conversations
✅ Nebula Glass UI — glassmorphism, gradients, micro-animations

---

## 🚀 Running the System

### One-click start (Windows)
```
start-ai-ass.bat
```

### Manually
```bash
cd backend
python main.py
```
Runs on: http://127.0.0.1:8000 — open in browser, done.

---

## 🔑 Hugging Face Token (free)

1. Create account: https://huggingface.co/join
2. Get token: https://huggingface.co/settings/tokens (Create new token, read/write)
3. Add to `backend/.env`:
   ```env
   LLM_PROVIDER=huggingface
   LLM_MODEL=Qwen/Qwen2.5-7B-Instruct
   HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxx
   ```
4. Restart backend.

> Without a token the app still works — it returns live web search results directly.

---

## 🔄 How "Live & Current" Works

1. You ask a question (e.g. "who is the president?")
2. Backend auto-searches the web (Wikipedia current facts + Google News headlines)
3. Results are injected into the AI's context
4. AI answers ONLY from the live results — never from outdated training data

---

## 📂 Project Structure

```
AI ASS/
  ├── backend/
  │   ├── main.py              ← Start here
  │   ├── app/
  │   │   ├── core/llm.py     ← HF/Claude/OpenAI/Ollama providers
  │   │   ├── memory/store.py ← SQLite + semantic search
  │   │   ├── tools/          ← Live web search (Wikipedia + News)
  │   │   ├── api/routes.py   ← Chat + search endpoints
  │   │   └── config.py       ← Settings
  │   ├── .env                ← HF token config
  │   └── requirements.txt
  ├── frontend/
  │   ├── src/
  │   │   ├── components/     ← Sidebar, ChatMessage, ChatInput, Settings
  │   │   ├── App.tsx         ← Main chat app
  │   │   └── main.js         ← Electron shell
  │   └── functions/          ← Cloudflare Pages (HF-powered)
  └── start-ai-ass.bat
```

---

## 🆘 Troubleshooting

**"Hugging Face error (400)"**
- Token missing/expired in `backend/.env`
- Get a new one: https://huggingface.co/settings/tokens

**Outdated answers**
- Ensure internet connection is working (web search needs it)

**Backend won't start**
- Run: `pip install -r requirements.txt`
- Verify Python 3.10+: `python --version`

---

## 🎉 You're All Set!

Chat at http://127.0.0.1:8000 — ask anything, answers stay live and current. Built by BHARATH K (B.Sc AIML). 🚀
