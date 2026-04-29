<div align="center">

# Gitwise AI

### AI-Powered Codebase Intelligence

**Paste a GitHub URL. Get a full breakdown of architecture, security, and code quality — then chat with the codebase.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-gitwiseai.vercel.app-6366f1?style=for-the-badge&logo=vercel&logoColor=white)](https://gitwiseai.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://github-agent-7a3z.onrender.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)

</div>

---

## Demo

> Screenshots / GIF / Video coming soon.

---

## What It Does

Gitwise deep-dives any public GitHub repository and produces **four AI-generated reports**, all streamed live to the browser as the agent works:

| Report | What you get |
|---|---|
| **Architecture Map** | Languages, frameworks, design patterns, entry points, folder structure, AI narrative |
| **Security Scan** | Hardcoded secrets, vulnerable patterns, severity scoring — CRITICAL / HIGH / MEDIUM / LOW |
| **Code Quality** | Complexity, test coverage ratio, TODO/FIXME hotspots, dead-code hints, letter grade A–F |
| **Auto README** | A production-quality README generated entirely from the analysis results |

After analysis, a **RAG Chat** interface lets you ask natural-language questions about the codebase and get answers with file + line citations.

**Reports are downloadable** as Markdown, JSON, or a full ZIP bundle — ready to drop into CI/CD pipelines, PR review bots, or LLM workflows.

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16 (App Router) | React framework, SSR, routing |
| React | 18.3 | UI library |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 3.4 | Utility-first styling |
| Vercel Analytics | — | Page views & performance |
| react-markdown | 9 | Render LLM-generated markdown reports |
| rehype-highlight | 7 | Syntax highlighting in markdown |
| remark-gfm | 4 | GitHub Flavored Markdown support |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Python | 3.11+ | Runtime |
| FastAPI | 0.115 | REST API + SSE streaming |
| Uvicorn | 0.32 | ASGI server |
| LangGraph | 0.2.53 | 6-node analysis pipeline |
| LangChain | 0.3.7 | LLM orchestration primitives |
| langchain-groq | 0.2.1 | Groq API client |
| Pydantic | 2.10 | Request/response validation |
| GitPython | 3.1 | Git operations |
| httpx | 0.27 | Async HTTP — HuggingFace calls |
| python-dotenv | 1.0 | Environment variable loading |

### AI / ML
| Technology | Purpose |
|---|---|
| Groq API | LLM inference — `llama-3.3-70b-versatile` |
| HuggingFace Inference API | Text embeddings — `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions) |

### Database & Infrastructure
| Service | Purpose |
|---|---|
| Supabase (PostgreSQL) | Hosted database |
| pgvector | Vector similarity search for RAG |
| Vercel | Frontend hosting — auto CI/CD from GitHub |
| Render | Backend hosting — free tier with cold-start warmup |
| Formspree | Zero-backend feedback form |

---

## Architecture

Gitwise uses a **LangGraph state machine** with six sequential nodes. Each node appends events to a per-session `asyncio.Queue`, which the frontend consumes via **Server-Sent Events (SSE)**.

```
START → clone → embed → architecture → security → quality → readme → END
```

```
Browser
  │
  ├─ POST /analyze  ──────────────────────→  FastAPI
  │                                              │
  ├─ GET  /stream/{session_id}  (SSE) ←──────   ├─ clone_node        (GitPython, shallow clone)
  │   · step events                             ├─ embed_node        (HF API → Supabase pgvector)
  │   · log events                              ├─ architecture_node  (static analysis + Groq LLM)
  │   · progress events                         ├─ security_node      (regex scan + Groq LLM)
  │   · report events (4× JSON blobs)           ├─ quality_node       (metrics + Groq LLM)
  │   · done event                              └─ readme_node        (Groq LLM)
  │
  └─ POST /chat  ─────────────────────────→  chat_with_repo()
                                               ├─ embed question (HF API)
                                               ├─ similarity_search (pgvector cosine)
                                               ├─ filepath_search (keyword match)
                                               └─ Groq LLM with context
```

### LangGraph Nodes

#### 1. `clone_node`
- Shallow-clones the repo (`--depth=1 --single-branch`) into `/tmp/repos/{session_id}`
- Walks the file tree, skipping `node_modules`, `.git`, `__pycache__`, `dist`, etc.
- Collects all recognized code/config files (`.py`, `.ts`, `.js`, `.go`, `.rs`, `.yaml`, `.sql`, etc.)
- Hard limits: **500 files max**, **100,000 lines max**, **500 KB per file**
- Always cleans up the clone from disk on finish — even on error

#### 2. `embed_node`
- Splits files into overlapping chunks via the `chunker` service
- Sends chunks to the HuggingFace Inference API in batches of 64
- Stores `(session_id, repo_url, file_path, content, embedding, start_line, end_line)` rows in Supabase `code_chunks`
- Retries on HTTP 429 / 503 with exponential backoff: 2 → 5 → 10 → 20 s

#### 3. `architecture_node`
- Static analysis: detects languages (by extension), frameworks (keyword patterns), design patterns, entry points, folder tree
- Emits the static data immediately — available for chat even if the LLM call fails
- Calls Groq `llama-3.3-70b-versatile` to generate an AI narrative
- Truncates folder tree to 3,000 characters before sending to the LLM

#### 4. `security_node`
- Regex-based scanner: hardcoded secrets, SQL injection patterns, `eval`/`exec` misuse, `subprocess.shell=True`, unsafe `pickle`, `assert`-based auth, etc.
- Severity scoring: CRITICAL (40), HIGH (20), MEDIUM (10), LOW (2) — capped at 100
- Risk level: CRITICAL (>70), HIGH (40–70), MEDIUM (15–40), LOW (<15)
- Top 20 findings sent to Groq for an AI remediation narrative

#### 5. `quality_node`
- Counts functions, classes, TODO/FIXMEs, test files, comment lines per file
- Computes cyclomatic complexity proxy, doc-comment ratio, test coverage ratio
- Letter grade: A (≥85), B (70–84), C (55–69), D (40–54), F (<40)
- Dead-code hints: functions prefixed `_` or `__` with no callers in other files

#### 6. `readme_node`
- Aggregates all three reports into a single prompt
- Calls Groq to generate a production-quality README with: Overview, Features, Tech Stack, Setup, Usage, API Reference, Contributing, License

### RAG Chat

1. Embed the question using the HF Inference API
2. **Semantic search** — cosine similarity via `match_code_chunks` Supabase RPC (top 12 results)
3. **Filepath keyword search** — exact/partial path matching (top 4 results), stop words filtered
4. Merge and deduplicate, preferring source code over docs
5. Cap at 5 context chunks + architecture metadata + last 2 conversation exchanges
6. Call Groq LLM with the combined context

### Session Lifecycle

- Sessions stored in-memory on the backend with a **2-hour TTL**
- Background cleanup loop runs every 30 minutes — deletes Supabase rows, frees memory
- Frontend caches the last session in `localStorage` — reports survive page refreshes until TTL expires
- Expired session chat returns HTTP 410 with a clear re-analyze prompt

---

## Project Structure

```
github-agent/
├── backend/
│   ├── main.py                    # FastAPI app — routes, SSE, CORS, cleanup loop
│   ├── agents/
│   │   ├── orchestrator.py        # LangGraph pipeline, session stores, chat_with_repo()
│   │   ├── prompts.py             # All LLM system prompts
│   │   └── tools.py               # Codebase search tool
│   ├── services/
│   │   ├── cloner.py              # Shallow git clone + file collection + size limits
│   │   ├── chunker.py             # Code → overlapping text chunks
│   │   ├── embedder.py            # HuggingFace Inference API, batched, retry logic
│   │   └── vector_store.py        # Supabase pgvector — upsert, search, delete
│   ├── reports/
│   │   ├── architecture.py        # Language/framework/pattern detection, folder tree
│   │   ├── security.py            # Regex vulnerability scanner + severity scoring
│   │   ├── quality.py             # Complexity, coverage, debt metrics
│   │   └── readme_gen.py          # LLM-powered README generation
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx             # Root layout, metadata, favicon
│   │   ├── page.tsx               # Main page — state machine, SSE consumer
│   │   ├── globals.css            # Tailwind base, animations, glass/gradient utilities
│   │   └── icon.svg               # Favicon — dark bg + gradient "G" monogram
│   ├── components/
│   │   ├── RepoInput.tsx          # URL input with typewriter placeholder
│   │   ├── DemoTerminal.tsx       # Animated demo terminal on the hero (auto-loops)
│   │   ├── StreamingLog.tsx       # Live SSE event log with progress rendering
│   │   ├── ReportTabs.tsx         # Tabbed display for all four reports + download menu
│   │   ├── ChatInterface.tsx      # RAG chat UI with message history
│   │   ├── AboutPanel.tsx         # About modal — pipeline, tech stack, feedback form
│   │   ├── IntegrationRecipes.tsx # Developer integration examples (CI/CD, PR review)
│   │   └── UseCaseShowcase.tsx    # Use-case showcase section
│   └── hooks/
│       └── useSnapScroll.ts       # Snap-scroll hook
│
├── .env.example
└── README.md
```

---

## Getting Started

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** and npm
- [Groq](https://console.groq.com) — free API key
- [Supabase](https://supabase.com) — free project (URL + anon key)
- [HuggingFace](https://huggingface.co/settings/tokens) — free Inference API token

### 1. Clone

```bash
git clone https://github.com/Saikannan1805/github-agent.git
cd github-agent
```

### 2. Set up Supabase

Open your Supabase project → **SQL Editor** and run:

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Code chunks table
CREATE TABLE code_chunks (
  id          BIGSERIAL PRIMARY KEY,
  session_id  TEXT NOT NULL,
  repo_url    TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  content     TEXT NOT NULL,
  embedding   vector(384) NOT NULL,
  start_line  INTEGER,
  end_line    INTEGER,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX ON code_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON code_chunks (session_id);
CREATE INDEX ON code_chunks (file_path);

-- Similarity search function
CREATE OR REPLACE FUNCTION match_code_chunks(
  query_embedding   vector(384),
  session_id_filter TEXT,
  match_count       INT DEFAULT 6
)
RETURNS TABLE (
  id          BIGINT,
  file_path   TEXT,
  content     TEXT,
  start_line  INTEGER,
  end_line    INTEGER,
  similarity  FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.id,
    cc.file_path,
    cc.content,
    cc.start_line,
    cc.end_line,
    1 - (cc.embedding <=> query_embedding) AS similarity
  FROM code_chunks cc
  WHERE cc.session_id = session_id_filter
  ORDER BY cc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### 3. Configure environment variables

```bash
cp .env.example backend/.env
```

Edit `backend/.env`:

```env
# Required
GROQ_API_KEY=gsk_...                    # console.groq.com → API Keys
SUPABASE_URL=https://xxx.supabase.co    # Supabase → Settings → API → Project URL
SUPABASE_KEY=eyJ...                     # Supabase → Settings → API → anon/public key
HUGGINGFACE_API_KEY=hf_...              # huggingface.co → Settings → Access Tokens

# Optional — raises GitHub rate limit from 60 to 5,000 req/hr
GITHUB_TOKEN=ghp_...
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 4. Run the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API live at `http://localhost:8000` · Swagger UI at `http://localhost:8000/docs`

### 5. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Usage

1. **Paste a GitHub URL** — e.g., `https://github.com/tiangolo/fastapi`
2. **Click Analyze** — the pipeline starts immediately
3. **Watch the live log** as the agent clones, embeds, and analyzes step-by-step
4. **Browse the four report tabs** — Architecture, Security, Code Quality, README
5. **Download any report** as Markdown, JSON, or grab everything as a ZIP
6. **Chat with the codebase** using the RAG interface — ask anything, get answers with file citations

> **Note:** The free Render tier spins down after inactivity. The frontend detects this, shows a "Warming up" indicator, and automatically fires your queued analysis when the backend is ready.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check — server ready status |
| `POST` | `/analyze` | Start a new analysis. Body: `{ repo_url }`. Returns `{ session_id }`. |
| `GET` | `/stream/{session_id}` | SSE stream of real-time pipeline events |
| `GET` | `/reports/{session_id}` | Fetch all completed reports |
| `POST` | `/chat` | RAG Q&A. Body: `{ session_id, question, history }`. |
| `GET` | `/status/{session_id}` | Session status — `running` / `complete` / `error` / `unknown` |

### SSE Event Types

```jsonc
{"type": "step",     "data": {"step": "cloning",   "message": "Cloning https://github.com/..."}}
{"type": "log",      "data": {"message": "Found 187 files · 24,391 lines of code"}}
{"type": "progress", "data": {"step": "embedding",  "percent": 64}}
{"type": "report",   "data": {"type": "architecture", "data": { ...report object... }}}
{"type": "report",   "data": {"type": "security",     "data": { ...report object... }}}
{"type": "report",   "data": {"type": "quality",      "data": { ...report object... }}}
{"type": "report",   "data": {"type": "readme",       "data": { ...report object... }}}
{"type": "done",     "data": {"message": "Analysis complete!"}}
{"type": "error",    "data": {"message": "Clone failed: repository not found"}}
```

Keep-alive pings (`: ping`) sent every 15 seconds to prevent proxy timeouts.

---

## Deployment

### Backend — Render

1. **New Web Service** → connect your GitHub repo
2. **Root Directory:** `backend`
3. **Build command:** `pip install -r requirements.txt`
4. **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables: `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `HUGGINGFACE_API_KEY`, `GITHUB_TOKEN`

### Frontend — Vercel

1. **Add New Project** → import your GitHub repo
2. **Root Directory:** `frontend`
3. **Environment variable:** `NEXT_PUBLIC_API_URL=https://your-service.onrender.com`
4. Deploy — Vercel auto-deploys on every push to `main`

---

## Limits

| Constraint | Value | Reason |
|---|---|---|
| Max files per repo | 500 | Memory + embedding cost |
| Max lines of code | 100,000 | LLM context |
| Max file size | 500 KB | Embedding token limit |
| SSE stream timeout | 10 minutes | Avoid zombie sessions |
| Session TTL | 2 hours | Supabase storage |
| LLM `max_tokens` | 4,096 | Groq output limit |
| Embedding batch size | 64 | HuggingFace rate limit |
| Chat context chunks | 5 | Token budget |
| Repo host | GitHub only | Auth URL substitution |

---

## Key Design Decisions

**LangGraph over a plain sequential script**
Gives a typed state that flows through all nodes, easy per-node error isolation, and future extensibility (parallel branches, conditional edges) without rewriting the core.

**SSE over WebSockets**
SSE is unidirectional (server → client), which is all pipeline streaming needs. Simpler, HTTP/1.1 compatible, works on Render without any special upgrade handling.

**HuggingFace Inference API over local sentence-transformers**
Render's free tier has limited RAM. Running sentence-transformers locally loads a ~90 MB model on startup. The HF Inference API offloads that entirely.

**Supabase pgvector over a dedicated vector DB**
The free tier includes pgvector with full SQL. No extra service, minimal stack, and hybrid queries (vector similarity + `session_id` filter) in a single RPC call.

**localStorage for report persistence**
Analysis takes 30–90 seconds. Caching reports in localStorage means users can close and reopen the tab without losing results — until the 2-hour backend TTL expires.

---

## Security Notes

- The security scanner is **static analysis (regex-based)** — a fast heuristic tool, not a full SAST suite. It may produce false positives and will not catch everything.
- For production, restrict `allow_origins` in `main.py` to your frontend domain.
- Use Supabase Row Level Security (RLS) if you add user accounts.
- `GITHUB_TOKEN` is optional but recommended — without it, unauthenticated GitHub API rate limit is 60 req/hr, which can cause clone failures on busy IPs.

---

## Local Dev Tips

```bash
# Backend API docs
http://localhost:8000/docs      # Swagger UI
http://localhost:8000/redoc     # ReDoc

# Debug backend
uvicorn main:app --reload --port 8000 --log-level debug

# Reset frontend localStorage cache
# DevTools → Application → Local Storage → delete `github_analyzer_session`
```

---

<div align="center">

Built by **[Saikannan Sathish](https://linkedin.com/in/saikannansathish)**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Saikannan%20Sathish-0077b5?style=flat-square&logo=linkedin&logoColor=white)](https://linkedin.com/in/saikannansathish)
[![GitHub](https://img.shields.io/badge/GitHub-Saikannan1805-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/Saikannan1805)

MIT License

</div>
