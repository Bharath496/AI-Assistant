# AI ASS

Created by **BHARATH K** — B.Sc AIML student. Live web search enabled — always up-to-date.

A desktop and web AI assistant powered by **Hugging Face serverless inference** (free, no install), with persistent memory and automatic live web knowledge.

## Features

✨ **Core Capabilities**
- Natural, multi-turn conversation with personality
- **Live, always-current knowledge** — automatic web search (Wikipedia + Google News) injected into every answer, no API key needed
- Memory system (conversation history + user facts + semantic search)
- Tool integration (web search, calendar, email, Notion, REST APIs)

🎨 **Interface**
- Electron desktop app with React + Tailwind (Nebula Glass UI)
- Dark glassmorphism design with gradient accents and micro-animations
- Suggestion chips, markdown rendering, copy buttons
- Message history sidebar

🔧 **Tech Stack**
- **Backend**: FastAPI + SQLite
- **Frontend**: Electron + React + TypeScript + Tailwind CSS
- **LLMs**: Hugging Face (default), Claude, OpenAI, Ollama
- **Memory**: SQLite + sentence-transformers embeddings
- **Tools**: Wikipedia/Google News (built-in, free), Tavily, Google APIs, Notion, REST APIs

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- A free Hugging Face token (optional but recommended): https://huggingface.co/settings/tokens

### Setup

1. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate        # Windows
   pip install -r requirements.txt
   
   # Create .env with your HF token
   copy .env.example .env
   ```

2. **Frontend Setup** (optional for web dev)
   ```bash
   cd frontend
   npm install
   ```

3. **Run the App**
   ```bash
   start-ai-ass.bat             # One-click start (Windows)
   ```
   or manually:
   ```bash
   cd backend
   python main.py
   # open http://127.0.0.1:8000
   ```

## Configuration

Edit `backend/.env`:

```env
# Hugging Face (recommended - free, no install)
LLM_PROVIDER=huggingface
LLM_MODEL=Qwen/Qwen2.5-7B-Instruct
HUGGINGFACE_API_KEY=hf_...your_token...

# Optional cloud providers
# LLM_PROVIDER=openai
# OPENAI_API_KEY=...
# LLM_PROVIDER=claude
# ANTHROPIC_API_KEY=...
```

### Live Web Search
Automatic and free — uses Wikipedia API + Google News RSS (no key required).
For higher quality results, add `TAVILY_API_KEY` in `.env`.

## Project Structure

```
AI_ASS/
├── backend/
│   ├── app/
│   │   ├── core/          # LLM manager (HF/Claude/OpenAI/Ollama)
│   │   ├── memory/        # SQLite conversation store + semantic search
│   │   ├── tools/         # Web search, calendar, email, Notion
│   │   ├── api/           # FastAPI routes
│   │   └── config.py      # Settings
│   ├── main.py            # FastAPI app entry point
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/    # Sidebar, ChatMessage, ChatInput, SettingsPanel
│   │   ├── styles/        # Nebula Glass design system
│   │   ├── App.tsx        # Main app component
│   │   └── index.tsx
│   ├── functions/         # Cloudflare Pages functions (HF-powered)
│   ├── src/main.js        # Electron main process
│   └── package.json
├── start-ai-ass.bat       # One-click start
├── verify-setup.py        # Setup checker
└── .env.example
```

## API Endpoints

### Chat
- `POST /api/chat` — Send message; auto-injects live web search results
  - Body: `{ conversation_id?, messages, system_prompt?, temperature?, max_tokens? }`

### Memory
- `GET /api/conversations/{id}` / `DELETE /api/conversations/{id}`
- `POST /api/facts` / `GET /api/facts` / `GET /api/facts/{key}`
- `POST /api/semantic-search` — search past conversations by meaning

### Tools
- `POST /api/tools/execute` — run a tool
- `POST /api/search` — live web search

### Health
- `GET /api/health`

## Deployment

### Cloudflare Pages (web)
- Project: `aiass` → https://aiass-akx.pages.dev
- Build: `npm run build:web`, output: `frontend/dist`
- Pages functions in `frontend/functions/api/` use **Hugging Face first** (set `HF_API_KEY` secret), Workers AI as fallback
- GitHub Actions secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_PAGES_PROJECT_NAME`

### Windows Desktop
- `npm run dist:win` → packaged Electron app (defaults to the hosted API)

## Troubleshooting

**Chat says "Hugging Face error (400)"**
- Check `HUGGINGFACE_API_KEY` in `backend/.env` (get free token at https://huggingface.co/settings/tokens)
- Model must be one of the router-supported models (e.g. `Qwen/Qwen2.5-7B-Instruct`)

**Answers are outdated**
- The system prompt forces the model to use injected web results for time-sensitive questions
- Verify internet connection — web search needs it

**Frontend won't connect**
- Verify backend is running on `127.0.0.1:8000`
- Check browser console for CORS errors

## Roadmap

- [x] Live web knowledge (automatic, always current)
- [x] Hugging Face serverless inference
- [x] Semantic memory search
- [x] Nebula Glass UI redesign
- [ ] Streaming responses
- [ ] RAG layer (document upload & search)
- [ ] Voice input/output
- [ ] Multi-conversation threads

## License

MIT

---

Built by **BHARATH K** (B.Sc AIML) with ❤️
