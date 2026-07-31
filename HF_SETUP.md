# AI ASS — Hugging Face Setup Guide

Created by **BHARATH K (B.Sc AIML)**. This guide covers the recommended way to power AI ASS with **free Hugging Face serverless inference** — no local model downloads, no GPU, no installs.

## Why Hugging Face?

| | Ollama (old) | Hugging Face (now) |
|---|---|---|
| Install | ~700MB installer | Nothing |
| Model download | 4GB+ llama2 | Nothing (server-side) |
| API key | Not needed | Free token |
| Works everywhere | Local only | Cloud + local |
| Model choice | Limited to pulled models | 129+ router models |

## Step 1 — Get a free token

1. Go to https://huggingface.co/join and create an account (or log in)
2. Open https://huggingface.co/settings/tokens
3. Click **Create new token** → name it `AI_ASS` → **WRITE** permissions → create
4. Copy the token (`hf_...`)

> ⚠️ Save it somewhere safe — you can only see it once.

## Step 2 — Configure backend/.env

```
LLM_PROVIDER=huggingface
LLM_MODEL=Qwen/Qwen2.5-7B-Instruct
HUGGINGFACE_API_KEY=hf_your_token_here
HUGGINGFACE_BASE_URL=https://router.huggingface.co/v1
```

## Step 3 — Start

```bash
cd backend
python main.py
```

Open http://127.0.0.1:8000 — you're live.

## Available models

The router exposes 129+ models. Try any of these in `LLM_MODEL`:

- `Qwen/Qwen2.5-7B-Instruct` (recommended — fast, stable)
- `Qwen/Qwen3-8B` (newer, reasoning-capable)
- `google/gemma-3-4b-it` (small & fast)
- `deepseek-ai/DeepSeek-R1` (reasoning)
- `mistralai/Mistral-7B-Instruct-v0.3`

Check the full list:
```
curl https://router.huggingface.co/v1/models -H "Authorization: Bearer YOUR_TOKEN"
```

## Live web search (included)

AI ASS automatically injects live Wikipedia + Google News results into every answer — no extra key needed. For premium search, add a Tavily key:
```
TAVILY_API_KEY=your_tavily_key
```

## Troubleshooting

**400: model not supported** — the model isn't on the router list; use one from the list above.

**401: unauthorized** — token expired or wrong; regenerate at https://huggingface.co/settings/tokens.

**Slow first reply** — serverless models cold-start; second message is faster.

**Rate limits** — free tier is generous; consider a paid HF plan for heavy usage.

## Verify

```
python verify-setup.py
```

Shows backend status, HF connectivity, and live search health in one go.
