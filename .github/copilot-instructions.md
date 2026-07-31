# Copilot Custom Instructions

This workspace contains **AI ASS**, built with Electron, FastAPI, and multi-provider LLM support.

## Quick Commands

- **Backend**: `cd backend && python main.py` (requires Python 3.10+, dependencies from `requirements.txt`)
- **Frontend**: `cd frontend && npm install && npm run dev` (requires Node.js 18+)
- **Config**: Copy `.env.example` to backend `.env` and add your API keys

## Architecture

- **Backend**: Python FastAPI with LiteLLM (multi-LLM support), SQLite memory store
- **Frontend**: Electron app with React + TypeScript + Tailwind CSS
- **Tools**: Web search, calendar, email, Notion, REST APIs

## Key Files

- [backend/main.py](backend/main.py) - FastAPI app entry point
- [backend/app/core/llm.py](backend/app/core/llm.py) - LLM manager (Hugging Face, Claude, OpenAI, Ollama)
- [backend/app/memory/store.py](backend/app/memory/store.py) - SQLite conversation & fact storage
- [backend/app/tools/integrations.py](backend/app/tools/integrations.py) - Tool layer
- [frontend/src/App.tsx](frontend/src/App.tsx) - React chat UI
- [frontend/src/main.js](frontend/src/main.js) - Electron main process

## Next Steps

1. **Install dependencies**: `cd backend && pip install -r requirements.txt` and `cd frontend && npm install`
2. **Configure APIs**: Copy `.env.example` to `.env` in backend folder, add your API keys
3. **Run locally**: Start backend, then start frontend
4. **Deploy**: Build Electron app with `npm run dist` in frontend folder

See [README.md](README.md) for full documentation.
