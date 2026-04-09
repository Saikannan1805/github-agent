# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev      # port 3000
npm run build
npm run lint
```

### Environment Setup
Copy `.env.example` to `backend/.env` and fill in:
- `GROQ_API_KEY` — from console.groq.com (free tier)
- `SUPABASE_URL` + `SUPABASE_KEY` — from Supabase project settings
- `GITHUB_TOKEN` — optional, for private repos

Set `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Supabase Schema (required before first run)
The `code_chunks` table and `match_code_chunks` RPC function must exist in Supabase. See README.md for the full SQL.

## Architecture

### Pipeline Flow
Each analysis runs as a LangGraph state machine in `backend/agents/orchestrator.py`:
```
clone → embed → architecture → security → quality → readme
```
All nodes share `AnalysisState` (TypedDict). Each session gets a UUID, an AsyncIO queue for SSE events, and isolated Supabase rows scoped by `session_id`.

### Backend Structure
- **`main.py`** — FastAPI app. `/analyze` starts a background `run_analysis()` task and returns a `session_id`. `/stream/{session_id}` is the SSE endpoint the frontend subscribes to. `/chat` calls `chat_with_repo()` directly.
- **`agents/orchestrator.py`** — The LangGraph graph definition plus `run_analysis()` and `chat_with_repo()`. This is the core orchestration logic.
- **`agents/prompts.py`** — All LLM system prompts (architecture, security, quality, README, chat). Edit here to tune report quality.
- **`services/`** — Stateless utilities: `cloner.py` (git clone + file filtering), `chunker.py` (80-line overlapping chunks), `embedder.py` (cached local sentence-transformers model), `vector_store.py` (Supabase upsert + similarity search).
- **`reports/`** — Static analysis modules that build metric dicts consumed by prompts: `architecture.py` (language/framework detection), `security.py` (regex secret/vuln scanning), `quality.py` (complexity, TODOs, test ratio).

### Frontend Structure
- **`app/page.tsx`** — Manages a 5-phase state machine (idle → analyzing → done/error) and owns the SSE subscription and report aggregation.
- **`components/`** — `RepoInput` → `StreamingLog` → `ReportTabs` + `ChatInterface` render sequentially as analysis progresses.

### RAG Chat Flow
`chat_with_repo()` in `orchestrator.py`:
1. Embeds the user question locally
2. Runs `similarity_search()` (pgvector cosine) + `filepath_search()` (keyword match on file paths)
3. Merges results, deprioritizing docs (README, `.md` files)
4. Injects last 2 chat turns + architecture metadata into `CHAT_SYSTEM_PROMPT`
5. Calls Groq with citations (file path + line numbers)

### Key Design Decisions
- **Embeddings are local** (all-MiniLM-L6-v2, 384-dim) — no API key needed, model is cached after first load via `_get_model()` in `embedder.py`.
- **LLM is Groq** (llama-3.3-70b-versatile) — fast inference, free tier sufficient for this workload.
- **Vector store isolation** — all chunks tagged with `session_id`; cleanup deletes by session.
- **Streaming** — agent nodes call `emit_event(queue, type, data)` at each step; frontend reads these via EventSource.
