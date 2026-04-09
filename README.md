# GitHub Repository Analyzer Agent

An AI-powered tool that deep-dives any GitHub repository and generates:
- **Architecture Report** — tech stack, frameworks, folder structure, design patterns
- **Security Scan** — hardcoded secrets, vulnerabilities, severity scoring
- **Code Quality Report** — complexity, test coverage, dead code, technical debt
- **Auto README** — professional README generated from the analysis
- **RAG Chat** — ask questions about the codebase with file + line citations

**Live streaming UI** shows the agent thinking and working in real time.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI + Python 3.11+ |
| Agent | LangGraph + Groq (llama-3.3-70b-versatile) |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2, local) |
| Vector DB | Supabase pgvector |
| Frontend | Next.js 15 + Tailwind CSS |
| Deployment | Vercel (frontend) + Render (backend) |

All AI features are **free**: Groq has a generous free tier, Supabase free tier includes pgvector, and sentence-transformers run locally.

---

## Project Structure

```
github-agent/
├── backend/
│   ├── main.py                  # FastAPI app (SSE streaming, routes)
│   ├── agents/
│   │   ├── orchestrator.py      # LangGraph pipeline + chat agent
│   │   ├── tools.py             # Codebase search tool (RAG)
│   │   └── prompts.py           # All LLM prompts
│   ├── services/
│   │   ├── cloner.py            # Git clone + file collection
│   │   ├── chunker.py           # Code chunking
│   │   ├── embedder.py          # sentence-transformers embeddings
│   │   └── vector_store.py      # Supabase pgvector CRUD
│   ├── reports/
│   │   ├── architecture.py      # Tech stack + structure analysis
│   │   ├── security.py          # Secret detection + vuln scanning
│   │   ├── quality.py           # Complexity, coverage, debt metrics
│   │   └── readme_gen.py        # LLM README generation
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx             # Main page + state orchestration
│   │   └── globals.css
│   └── components/
│       ├── RepoInput.tsx        # URL input form
│       ├── StreamingLog.tsx     # Live agent log (SSE consumer)
│       ├── ReportTabs.tsx       # Tabbed report display
│       └── ChatInterface.tsx    # RAG chat UI
├── .env.example
└── README.md
```

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- A free [Groq account](https://console.groq.com) → API key
- A free [Supabase project](https://supabase.com) → URL + key

---

## Setup

### 1. Clone this repo

```bash
git clone <your-repo-url>
cd github-agent
```

### 2. Set up Supabase

Open your Supabase project → **SQL Editor** and run:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the code chunks table
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

-- Similarity search function used by the RAG system
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

### 3. Configure environment

```bash
cp .env.example backend/.env
```

Edit `backend/.env`:

```env
GROQ_API_KEY=gsk_...          # from console.groq.com
SUPABASE_URL=https://...      # from Supabase Settings > API
SUPABASE_KEY=eyJ...           # anon key (or service_role key)
GITHUB_TOKEN=ghp_...          # optional, raises rate limit
```

### 4. Install backend dependencies

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

> **Note:** The first run will download the `all-MiniLM-L6-v2` model (~90 MB). It's cached locally after that.

### 5. Start the backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

The API will be live at `http://localhost:8000`. You can check `http://localhost:8000/docs` for interactive API docs.

### 6. Install frontend dependencies

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 7. Start the frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Usage

1. **Paste a GitHub URL** into the input box (e.g., `https://github.com/tiangolo/fastapi`)
2. **Click Analyze** — the agent starts working immediately
3. **Watch the live log** as the agent clones, embeds, and analyzes the repo
4. **Browse the reports** in the Architecture / Security / Quality / README tabs
5. **Chat** with the repo using the RAG interface at the bottom

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/analyze` | Start analysis. Body: `{"repo_url": "..."}`. Returns `session_id`. |
| `GET` | `/stream/{session_id}` | SSE stream of analysis events |
| `GET` | `/reports/{session_id}` | Fetch all generated reports |
| `POST` | `/chat` | RAG chat. Body: `{"session_id": "...", "question": "...", "history": [...]}` |
| `GET` | `/status/{session_id}` | Check analysis status |
| `GET` | `/health` | Health check |

### SSE Event Types

```jsonc
{"type": "step",     "data": {"step": "cloning", "message": "Cloning repo..."}}
{"type": "log",      "data": {"message": "Found 42 files"}}
{"type": "progress", "data": {"step": "embedding", "percent": 100}}
{"type": "report",   "data": {"type": "architecture", "data": {...}}}
{"type": "done",     "data": {"message": "Analysis complete!"}}
{"type": "error",    "data": {"message": "..."}}
```

---

## Deployment

### Backend on Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Root directory: `backend`
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add all env vars in the Render dashboard
6. Use a **Standard** instance (512 MB RAM minimum for sentence-transformers)

### Frontend on Vercel

1. Import the repo on [vercel.com](https://vercel.com)
2. Root directory: `frontend`
3. Add env var: `NEXT_PUBLIC_API_URL=https://your-render-app.onrender.com`
4. Deploy!

---

## Security Notes

- The security scanner uses static analysis (regex-based) — it is not a replacement for a full SAST tool
- Never commit real credentials; the scanner will flag them
- For production, restrict `allow_origins` in `main.py` to your frontend domain
- Use Supabase Row Level Security (RLS) if users can access each other's sessions

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit and push
4. Open a Pull Request

---

## License

MIT
