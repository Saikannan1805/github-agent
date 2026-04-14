# Gitwise — AI Codebase Intelligence

> Paste a GitHub URL. Get a full AI-powered breakdown of architecture, security, and code quality — then chat with the codebase.

**Live demo:** [gitwise.vercel.app](https://gitwise.vercel.app) &nbsp;·&nbsp; **Backend:** Render &nbsp;·&nbsp; **Built by:** [Saikannan Sathish](https://linkedin.com/in/saikannansathish)

---

## What It Does

Gitwise deep-dives any public GitHub repository and produces four reports, all streamed live to the browser as the agent works:

| Report | What you get |
|---|---|
| **Architecture Map** | Languages, frameworks, design patterns, entry points, folder structure, AI narrative |
| **Security Scan** | Hardcoded secrets, vulnerable patterns, severity scoring (CRITICAL / HIGH / MEDIUM / LOW) |
| **Code Quality** | Complexity distribution, test coverage ratio, TODO/FIXME hotspots, dead-code hints, letter grade |
| **Auto README** | A professional README generated entirely from the analysis results |

After analysis completes, a **RAG Chat** interface lets you ask natural-language questions about the codebase and get answers with file + line citations.

---

## Screenshots

```
Hero page → paste URL → live streaming log → tabbed reports → chat
```

*(Add screenshots here once deployed)*

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 15 (App Router) | React framework, SSR, routing |
| React | 18.3 | UI library |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 3.4 | Utility-first styling |
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
| httpx | 0.27 | Async HTTP (HuggingFace calls) |
| python-dotenv | 1.0 | Environment variable loading |

### AI / ML
| Technology | Purpose |
|---|---|
| Groq API | LLM inference — `llama-3.3-70b-versatile` |
| HuggingFace Inference API | Text embeddings — `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions) |

### Database
| Technology | Purpose |
|---|---|
| Supabase (PostgreSQL) | Hosted database |
| pgvector | Vector similarity search for RAG |

### Infrastructure
| Service | Purpose |
|---|---|
| Vercel | Frontend hosting (automatic CI/CD from GitHub) |
| Render | Backend hosting (free tier with cold starts) |
| Formspree | Zero-backend feedback form |

---

## Architecture

### Pipeline Overview

Gitwise uses a **LangGraph state machine** with six sequential nodes. Each node appends events to a per-session `asyncio.Queue`, which the frontend consumes via **Server-Sent Events (SSE)**.

```
START → clone → embed → architecture → security → quality → readme → END
```

```
Browser
  │
  ├─ POST /analyze  ──────────────────────→  FastAPI
  │                                              │
  ├─ GET  /stream/{session_id}  (SSE) ←──────   ├─ clone_node      (GitPython, shallow clone)
  │   · step events                             ├─ embed_node      (HF API → Supabase pgvector)
  │   · log events                              ├─ architecture_node (static analysis + Groq LLM)
  │   · progress events                         ├─ security_node    (regex scan + Groq LLM)
  │   · report events (4× JSON blobs)           ├─ quality_node     (metrics + Groq LLM)
  │   · done event                              └─ readme_node      (Groq LLM)
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
- Cleans up the clone from disk when the pipeline finishes (always, even on error)

#### 2. `embed_node`
- Splits files into overlapping chunks via the `chunker` service
- Sends chunks to the HuggingFace Inference API in batches of 64
- Stores `(session_id, repo_url, file_path, content, embedding, start_line, end_line)` rows in Supabase `code_chunks`
- Retries on HTTP 429 / 503 with exponential backoff (2 → 5 → 10 → 20 s)

#### 3. `architecture_node`
- Static analysis: detects languages (by extension), frameworks (keyword patterns), design patterns, entry points, folder tree
- Emits the static data to the session reports immediately (available for chat even if LLM call fails)
- Calls Groq `llama-3.3-70b-versatile` with the static data to generate an AI narrative
- Truncates folder tree to 3,000 characters before sending to the LLM

#### 4. `security_node`
- Regex-based scanner covering: hardcoded secrets (API keys, passwords, tokens), SQL injection patterns, `eval`/`exec` misuse, `subprocess.shell=True`, unsafe `pickle`, `assert`-based auth, etc.
- Severity scoring: CRITICAL (score 40), HIGH (20), MEDIUM (10), LOW (2)
- Risk score capped at 100; risk level: CRITICAL (>70), HIGH (40–70), MEDIUM (15–40), LOW (<15)
- Top 20 findings sent to Groq for an AI remediation narrative

#### 5. `quality_node`
- Counts functions, classes, TODO/FIXMEs, test files, comment lines per file
- Computes cyclomatic complexity proxy (branch keywords), doc-comment ratio, test coverage ratio
- Quality score formula accounts for test coverage, comment ratio, complexity, and TODOs
- Letter grade: A (≥85), B (70–84), C (55–69), D (40–54), F (<40)
- Dead-code hints: functions prefixed `_` or `__` without any callers in other files

#### 6. `readme_node`
- Aggregates architecture + security + quality reports into a single prompt
- Calls Groq to generate a production-quality README with sections: Overview, Features, Tech Stack, Setup, Usage, API Reference, Contributing, License

### RAG Chat

After analysis, users can ask questions about the codebase. The chat flow:

1. Embed the question using the HF Inference API
2. Run **semantic search** (cosine similarity via `match_code_chunks` Supabase function, top 12 results)
3. Run **filepath keyword search** (exact/partial path matching, top 4 results) — stops words filtered
4. Merge and deduplicate results, preferring source code files over docs
5. Cap at 5 context chunks
6. Inject architecture metadata (languages, frameworks, directory summary)
7. Include last 2 conversation exchanges for continuity
8. Call Groq LLM with the combined context

### Session Lifecycle

- Sessions are stored in-memory (`dict`s) on the backend
- Session TTL: **2 hours** (background cleanup loop runs every 30 minutes)
- On expiry: Supabase `code_chunks` rows are deleted, memory is freed
- Frontend caches the last session in `localStorage` — reports survive page refreshes until cleared
- Attempting to chat on an expired session returns HTTP 410

---

## Project Structure

```
github-agent/
├── backend/
│   ├── main.py                    # FastAPI app — routes, SSE, CORS, cleanup loop
│   ├── agents/
│   │   ├── orchestrator.py        # LangGraph pipeline, session stores, chat_with_repo()
│   │   ├── prompts.py             # All LLM system prompts (architecture, security, quality, chat)
│   │   └── tools.py               # (legacy) codebase search tool
│   ├── services/
│   │   ├── cloner.py              # Shallow git clone + file collection + size limits
│   │   ├── chunker.py             # Code → overlapping text chunks
│   │   ├── embedder.py            # HuggingFace Inference API, batched, retry logic
│   │   └── vector_store.py        # Supabase pgvector CRUD (upsert, similarity search, filepath search, delete)
│   ├── reports/
│   │   ├── architecture.py        # Language/framework/pattern detection, folder tree
│   │   ├── security.py            # Regex vulnerability scanner + severity scoring
│   │   ├── quality.py             # Complexity, coverage, debt metrics
│   │   └── readme_gen.py          # LLM-powered README generation
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx             # Root layout, metadata, favicon, ambient glows
│   │   ├── page.tsx               # Main page — all state, phase machine, SSE consumer
│   │   ├── globals.css            # Tailwind base, custom animations, glass/gradient utilities
│   │   └── icon.svg               # Custom favicon: dark bg + gradient "G" monogram
│   └── components/
│       ├── RepoInput.tsx          # URL input with validation and loading state
│       ├── DemoTerminal.tsx       # Animated demo terminal on the hero page (auto-loops)
│       ├── StreamingLog.tsx       # Live SSE event log with step/log/progress rendering
│       ├── ReportTabs.tsx         # Tabbed display for all four reports
│       ├── ChatInterface.tsx      # RAG chat UI with message history
│       └── AboutPanel.tsx         # Modal about panel — tech stack, features, feedback form
│
├── .env.example
└── README.md
```

---

## Getting Started

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** and npm
- A free [Groq account](https://console.groq.com) → API key
- A free [Supabase project](https://supabase.com) → Project URL + anon key
- A free [HuggingFace account](https://huggingface.co/settings/tokens) → Inference API token

### 1. Clone the repository

```bash
git clone https://github.com/Saikannan1805/github-agent.git
cd github-agent
```

### 2. Set up Supabase

Open your Supabase project → **SQL Editor** and run the following SQL to create the vector store:

```sql
-- Enable the pgvector extension
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

-- Indexes for fast lookup
CREATE INDEX ON code_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON code_chunks (session_id);
CREATE INDEX ON code_chunks (file_path);

-- Similarity search function used by RAG chat
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

Edit `backend/.env` with your credentials:

```env
# Required
GROQ_API_KEY=gsk_...              # Groq console → API Keys
SUPABASE_URL=https://xxx.supabase.co   # Supabase → Settings → API → Project URL
SUPABASE_KEY=eyJ...               # Supabase → Settings → API → anon/public key
HUGGINGFACE_API_KEY=hf_...        # HuggingFace → Settings → Access Tokens

# Optional — increases GitHub rate limit from 60 to 5,000 req/hr
GITHUB_TOKEN=ghp_...
```

### 4. Install and run the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

uvicorn main:app --reload --port 8000
```

The API will be live at `http://localhost:8000`.
Interactive API docs: `http://localhost:8000/docs`

### 5. Install and run the frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Usage

1. **Paste a GitHub URL** — e.g., `https://github.com/tiangolo/fastapi`
2. **Click Analyze** — the pipeline starts immediately
3. **Watch the live log** as the agent clones, embeds, and analyzes step-by-step
4. **Browse the four report tabs**: Architecture, Security, Code Quality, README
5. **Chat with the codebase** using the RAG interface — ask anything about the code

> **Tip:** If the server is still warming up when you submit, your analysis is automatically queued and fires as soon as the backend responds.

---

## API Reference

### Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check — used by the frontend to detect server status |
| `POST` | `/analyze` | Start a new analysis. Returns a `session_id`. |
| `GET` | `/stream/{session_id}` | SSE stream of real-time analysis events |
| `GET` | `/reports/{session_id}` | Fetch all generated reports for a completed session |
| `POST` | `/chat` | RAG-powered Q&A about the repository |
| `GET` | `/status/{session_id}` | Check session status (`running` / `complete` / `error` / `unknown`) |

### Request / Response Examples

#### `POST /analyze`

```json
// Request
{ "repo_url": "https://github.com/axios/axios" }

// Response
{ "session_id": "3f8a1b2c-...", "status": "started" }
```

#### `GET /stream/{session_id}` — SSE Events

Each event is a JSON object on a `data:` line:

```jsonc
// Pipeline step announced
{"type": "step", "data": {"step": "cloning", "message": "Cloning https://github.com/axios/axios..."}}

// Informational log line
{"type": "log", "data": {"message": "Found 187 files · 24,391 lines of code"}}

// Step progress
{"type": "progress", "data": {"step": "embedding", "percent": 100}}

// Report ready (one event per report type)
{"type": "report", "data": {"type": "architecture", "data": { ...full report object... }}}
{"type": "report", "data": {"type": "security",     "data": { ...full report object... }}}
{"type": "report", "data": {"type": "quality",      "data": { ...full report object... }}}
{"type": "report", "data": {"type": "readme",       "data": { ...full report object... }}}

// Terminal events
{"type": "done",  "data": {"message": "Analysis complete!"}}
{"type": "error", "data": {"message": "Clone failed: repository not found"}}
```

Keep-alive pings (`: ping`) are sent every 15 seconds to prevent proxy timeouts.

#### `POST /chat`

```json
// Request
{
  "session_id": "3f8a1b2c-...",
  "question": "Where is the authentication middleware defined?",
  "history": [
    {"role": "user",      "content": "What tech stack does this project use?"},
    {"role": "assistant", "content": "It uses FastAPI with PostgreSQL..."}
  ]
}

// Response
{ "answer": "The authentication middleware is in `src/middleware/auth.js` (lines 14-67)...", "session_id": "3f8a1b2c-..." }
```

---

## Deployment

### Backend — Render

1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect your GitHub repo
3. Set **Root Directory** to `backend`
4. **Build command:** `pip install -r requirements.txt`
5. **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables in the Render dashboard:
   - `GROQ_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `HUGGINGFACE_API_KEY`
   - `GITHUB_TOKEN` (optional)
7. Deploy

> **Note:** The free Render tier spins down after inactivity. The frontend detects this and shows a "Warming up" indicator, then automatically fires your queued analysis when the server is ready.

### Frontend — Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Set **Root Directory** to `frontend`
4. Add environment variable: `NEXT_PUBLIC_API_URL=https://your-render-service.onrender.com`
5. Deploy

Vercel auto-deploys on every push to `main`.

---

## Limits & Constraints

| Constraint | Limit | Reason |
|---|---|---|
| Max files per repo | 500 | Memory + embedding cost |
| Max lines of code | 100,000 | LLM context + cost |
| Max file size | 500 KB | Embedding token limit |
| SSE stream timeout | 10 minutes | Avoid zombie sessions |
| Session TTL | 2 hours | Supabase storage / free tier |
| LLM `max_tokens` | 4,096 | Groq output limit per call |
| Embedding batch size | 64 | HuggingFace rate limit |
| Chat context chunks | 5 | Token budget for LLM |
| Repo host | GitHub only | Auth URL substitution |

---

## Key Design Decisions

**Why LangGraph instead of a simple sequential script?**
LangGraph gives a clear typed state that flows through all nodes, easy error isolation per node, and future extensibility (parallel branches, conditional edges, human-in-the-loop checkpoints) without rewriting the core logic.

**Why SSE instead of WebSockets?**
SSE is unidirectional (server → client), which is all we need for streaming pipeline events. It's simpler, HTTP/1.1 compatible, and works out-of-the-box on Render without any special WebSocket upgrade handling.

**Why HuggingFace Inference API instead of local sentence-transformers?**
Render's free tier has limited RAM. Running `sentence-transformers` locally would require loading a ~90 MB model into memory on startup. The HF Inference API offloads that entirely and keeps the backend footprint small.

**Why Supabase pgvector instead of a dedicated vector DB?**
Supabase's free tier includes pgvector with full SQL capabilities. Using it avoids adding another service, keeps the stack minimal, and lets us do hybrid queries (vector similarity + SQL filters like `session_id`) in a single RPC call.

**Why store reports in `localStorage`?**
Analysis takes 30–90 seconds. Storing reports in `localStorage` means users can close and reopen the tab without losing results (until the 2-hour backend TTL expires).

---

## Security Notes

- The security scanner uses **static analysis (regex-based)**. It is a fast heuristic scanner, not a full SAST tool. It will not catch all vulnerabilities, and may produce false positives.
- **Never commit real credentials.** The scanner will flag them.
- For production, restrict `allow_origins` in `main.py` to your frontend domain.
- Use Supabase Row Level Security (RLS) if you add user accounts and don't want sessions to be accessible across users.
- The `GITHUB_TOKEN` is optional but recommended — without it, GitHub's unauthenticated API rate limit is 60 requests/hour, which can cause clone failures on busy IPs.

---

## Local Development Tips

**Run backend tests (if added):**
```bash
cd backend && pytest
```

**Check API docs interactively:**
```
http://localhost:8000/docs      # Swagger UI
http://localhost:8000/redoc     # ReDoc
```

**Tail backend logs:**
```bash
uvicorn main:app --reload --port 8000 --log-level debug
```

**Reset the frontend cache:**
Open browser DevTools → Application → Local Storage → delete `github_analyzer_session`

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes with a clear message
4. Push and open a Pull Request

Bug reports and feature requests are welcome — open an issue or use the feedback form in the app.

---

## License

MIT — free to use, modify, and distribute.

---

## About the Author

Built by **Saikannan Sathish** — a developer who enjoys building tools at the intersection of AI and developer productivity.

- LinkedIn: [linkedin.com/in/saikannansathish](https://linkedin.com/in/saikannansathish)
- GitHub: [github.com/Saikannan1805](https://github.com/Saikannan1805)
