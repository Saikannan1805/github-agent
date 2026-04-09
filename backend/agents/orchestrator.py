"""
LangGraph analysis orchestrator.

Graph flow:
  START → clone → embed → architecture → security → quality → readme → END

Each node appends SSE events to a shared asyncio.Queue via session_id lookup.
"""

import asyncio
import json
import os
import time
from typing import Annotated, TypedDict
import operator

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from langgraph.graph import END, START, StateGraph

from agents.prompts import ARCHITECTURE_PROMPT, QUALITY_PROMPT, SECURITY_PROMPT
from reports.architecture import format_dir_summary
from reports.architecture import build_architecture_report
from reports.quality import build_quality_report
from reports.readme_gen import generate_readme
from reports.security import build_security_report
from services.chunker import chunk_all_files, get_file_summary
from services.cloner import cleanup_repo, clone_repo
from services.embedder import embed_texts
from services.vector_store import upsert_chunks

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
MODEL_NAME = "llama-3.3-70b-versatile"

# ---------------------------------------------------------------------------
# Global session stores
# ---------------------------------------------------------------------------
_event_queues: dict[str, asyncio.Queue] = {}
_reports: dict[str, dict] = {}
_status: dict[str, str] = {}  # "running" | "complete" | "error"
_errors: dict[str, str] = {}  # last error message per session
_session_created_at: dict[str, float] = {}  # session_id → unix timestamp

SESSION_TTL_SECONDS = 2 * 60 * 60  # 2 hours


def get_reports(session_id: str) -> dict:
    return _reports.get(session_id, {})


def get_status(session_id: str) -> str:
    return _status.get(session_id, "unknown")


def get_error(session_id: str) -> str:
    return _errors.get(session_id, "")


def create_session_queue(session_id: str) -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue()
    _event_queues[session_id] = q
    _session_created_at[session_id] = time.time()
    return q


def get_session_queue(session_id: str) -> asyncio.Queue | None:
    return _event_queues.get(session_id)


# ---------------------------------------------------------------------------
# LangGraph State
# ---------------------------------------------------------------------------
class AnalysisState(TypedDict):
    session_id: str
    repo_url: str
    repo_path: str
    files: list[dict]
    arch_report: dict
    security_report: dict
    quality_report: dict
    readme_report: dict
    logs: Annotated[list[str], operator.add]
    errors: Annotated[list[str], operator.add]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _llm() -> ChatGroq:
    return ChatGroq(
        api_key=GROQ_API_KEY,
        model=MODEL_NAME,
        temperature=0.2,
        max_tokens=4096,
    )


async def _emit(session_id: str, event_type: str, data: dict) -> None:
    q = _event_queues.get(session_id)
    if q:
        await q.put({"type": event_type, "data": data})


async def _llm_report(llm: ChatGroq, system_prompt: str, user_content: str) -> str:
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_content),
    ]
    response = await llm.ainvoke(messages)
    return response.content


# ---------------------------------------------------------------------------
# Graph Nodes
# ---------------------------------------------------------------------------
async def clone_node(state: AnalysisState) -> dict:
    session_id = state["session_id"]
    repo_url = state["repo_url"]

    await _emit(session_id, "step", {"step": "cloning", "message": f"Cloning {repo_url}..."})

    try:
        repo_path, files, failed_files = await clone_repo(repo_url, session_id)
        summary = get_file_summary(files)
        await _emit(
            session_id,
            "log",
            {
                "message": f"Cloned successfully. Found {summary['total_files']} files, "
                f"{summary['total_lines']:,} lines of code ({summary['total_size_kb']} KB)"
            },
        )
        if not files:
            await _emit(session_id, "log", {"message": "⚠️  No code files found in repo — check the URL or repo contents"})
        if failed_files:
            await _emit(session_id, "log", {"message": f"⚠️  Failed to read {len(failed_files)} file(s): {'; '.join(failed_files[:5])}"})
        await _emit(session_id, "progress", {"step": "cloning", "percent": 100})
        return {"repo_path": repo_path, "files": files, "logs": [f"Cloned {repo_url}"]}
    except Exception as e:
        await _emit(session_id, "error", {"message": f"Clone failed: {e}"})
        return {"repo_path": "", "files": [], "errors": [str(e)]}


async def embed_node(state: AnalysisState) -> dict:
    session_id = state["session_id"]
    files = state["files"]

    if not files:
        return {"logs": ["No files to embed"]}

    await _emit(session_id, "step", {"step": "embedding", "message": "Chunking and embedding code..."})

    try:
        chunks = chunk_all_files(files)
        await _emit(session_id, "log", {"message": f"Created {len(chunks)} chunks for embedding"})

        texts = [c["content"] for c in chunks]
        embeddings = await embed_texts(texts)

        await _emit(session_id, "log", {"message": "Storing embeddings in Supabase pgvector..."})
        await upsert_chunks(chunks, embeddings, session_id, state["repo_url"])

        await _emit(session_id, "log", {"message": f"Indexed {len(chunks)} chunks into vector store"})
        await _emit(session_id, "progress", {"step": "embedding", "percent": 100})
        return {"logs": [f"Embedded {len(chunks)} chunks"]}
    except Exception as e:
        await _emit(session_id, "error", {"message": f"Embedding failed: {e}"})
        return {"errors": [str(e)]}


async def architecture_node(state: AnalysisState) -> dict:
    session_id = state["session_id"]
    files = state["files"]

    await _emit(session_id, "step", {"step": "architecture", "message": "Analyzing architecture and tech stack..."})

    raw = build_architecture_report(files, state["repo_url"])
    raw["dir_summary"] = format_dir_summary(files)
    await _emit(session_id, "log", {
        "message": f"Detected languages: {', '.join(list(raw['languages'].keys())[:5])}"
    })
    await _emit(session_id, "log", {
        "message": f"Detected frameworks: {', '.join(raw['frameworks'][:5]) or 'none identified'}"
    })

    # Save static data immediately — available for chat even if LLM call below fails
    _reports.setdefault(session_id, {})["architecture"] = raw

    llm = _llm()
    folder_tree = raw["folder_tree"]
    if len(folder_tree) > 3000:
        folder_tree = folder_tree[:3000] + "\n... (truncated for brevity)"
    user_content = f"""
Repository: {state['repo_url']}
Languages: {raw['languages']}
Frameworks: {raw['frameworks']}
Patterns: {raw['patterns']}
Entry Points: {raw['entry_points']}
Stats: {raw['stats']}
Folder Structure:
{folder_tree}
""".strip()

    ai_analysis = await _llm_report(llm, ARCHITECTURE_PROMPT, user_content)
    raw["ai_analysis"] = ai_analysis

    await _emit(session_id, "report", {"type": "architecture", "data": raw})
    await _emit(session_id, "progress", {"step": "architecture", "percent": 100})
    return {"arch_report": raw, "logs": ["Architecture analysis complete"]}


async def security_node(state: AnalysisState) -> dict:
    session_id = state["session_id"]
    files = state["files"]

    await _emit(session_id, "step", {"step": "security", "message": "Scanning for security vulnerabilities..."})

    raw = build_security_report(files)
    await _emit(session_id, "log", {
        "message": f"Security scan complete. Risk level: {raw['risk_level']} — "
        f"{raw['total_findings']} findings "
        f"(critical: {raw['severity_counts']['critical']}, high: {raw['severity_counts']['high']})"
    })

    llm = _llm()
    findings_text = json.dumps(raw["findings"][:20], indent=2)
    user_content = f"""
Risk Level: {raw['risk_level']} (Score: {raw['risk_score']}/100)
Severity Counts: {raw['severity_counts']}
Total Findings: {raw['total_findings']}

Top Findings:
{findings_text}
""".strip()

    ai_analysis = await _llm_report(llm, SECURITY_PROMPT, user_content)
    raw["ai_analysis"] = ai_analysis

    _reports.setdefault(session_id, {})["security"] = raw
    await _emit(session_id, "report", {"type": "security", "data": raw})
    await _emit(session_id, "progress", {"step": "security", "percent": 100})
    return {"security_report": raw, "logs": ["Security scan complete"]}


async def quality_node(state: AnalysisState) -> dict:
    session_id = state["session_id"]
    files = state["files"]

    await _emit(session_id, "step", {"step": "quality", "message": "Analyzing code quality metrics..."})

    raw = build_quality_report(files)
    summary = raw["summary"]
    await _emit(session_id, "log", {
        "message": f"Quality grade: {summary['quality_grade']} ({summary['quality_score']}/100) — "
        f"Test ratio: {summary['test_coverage_ratio']:.1%}, TODOs: {summary['total_todos']}"
    })

    llm = _llm()
    user_content = f"""
Quality Score: {summary['quality_score']}/100 (Grade: {summary['quality_grade']})
Total Files: {summary['total_files']}
Total Lines: {summary['total_lines']}
Functions: {summary['total_functions']}
Classes: {summary['total_classes']}
TODOs/FIXMEs: {summary['total_todos']}
Test Files: {summary['test_files']} ({summary['test_coverage_ratio']:.1%} ratio)
Avg Comment Ratio: {summary['avg_comment_ratio']:.1%}
Complexity Distribution: {raw['complexity_distribution']}
Largest Files: {raw['largest_files'][:5]}
TODO Hotspots: {raw['todo_hotspots'][:5]}
Dead Code Hints: {raw['dead_code_hints'][:5]}
""".strip()

    ai_analysis = await _llm_report(llm, QUALITY_PROMPT, user_content)
    raw["ai_analysis"] = ai_analysis

    _reports.setdefault(session_id, {})["quality"] = raw
    await _emit(session_id, "report", {"type": "quality", "data": raw})
    await _emit(session_id, "progress", {"step": "quality", "percent": 100})
    return {"quality_report": raw, "logs": ["Code quality analysis complete"]}


async def readme_node(state: AnalysisState) -> dict:
    session_id = state["session_id"]

    await _emit(session_id, "step", {"step": "readme", "message": "Generating auto README..."})

    llm = _llm()
    raw = await generate_readme(
        llm=llm,
        repo_url=state["repo_url"],
        arch_report=state.get("arch_report", {}),
        security_report=state.get("security_report", {}),
        quality_report=state.get("quality_report", {}),
    )

    _reports.setdefault(session_id, {})["readme"] = raw
    await _emit(session_id, "report", {"type": "readme", "data": raw})
    await _emit(session_id, "log", {"message": f"README generated ({raw['word_count']} words)"})
    await _emit(session_id, "progress", {"step": "readme", "percent": 100})
    return {"readme_report": raw, "logs": ["README generation complete"]}


# ---------------------------------------------------------------------------
# Build the LangGraph
# ---------------------------------------------------------------------------
def build_graph():
    g = StateGraph(AnalysisState)

    g.add_node("clone", clone_node)
    g.add_node("embed", embed_node)
    g.add_node("architecture", architecture_node)
    g.add_node("security", security_node)
    g.add_node("quality", quality_node)
    g.add_node("readme", readme_node)

    g.add_edge(START, "clone")
    g.add_edge("clone", "embed")
    g.add_edge("embed", "architecture")
    g.add_edge("architecture", "security")
    g.add_edge("security", "quality")
    g.add_edge("quality", "readme")
    g.add_edge("readme", END)

    return g.compile()


_graph = None


def get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph


# ---------------------------------------------------------------------------
# TTL-based session cleanup
# ---------------------------------------------------------------------------
async def cleanup_expired_sessions() -> list[str]:
    """Delete Supabase chunks and in-memory state for sessions older than SESSION_TTL_SECONDS.
    Returns list of purged session IDs."""
    from services.vector_store import delete_session_chunks

    now = time.time()
    expired = [
        sid for sid, created in list(_session_created_at.items())
        if now - created > SESSION_TTL_SECONDS and _status.get(sid) != "running"
    ]

    for sid in expired:
        try:
            await delete_session_chunks(sid)
        except Exception:
            pass  # don't let a Supabase error block the rest of cleanup
        _event_queues.pop(sid, None)
        _reports.pop(sid, None)
        _status.pop(sid, None)
        _errors.pop(sid, None)
        _session_created_at.pop(sid, None)

    return expired


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
async def run_analysis(session_id: str, repo_url: str) -> None:
    """Run the full analysis pipeline for a repo. Called as a background task."""
    _status[session_id] = "running"
    queue = _event_queues.get(session_id)

    try:
        graph = get_graph()
        initial_state: AnalysisState = {
            "session_id": session_id,
            "repo_url": repo_url,
            "repo_path": "",
            "files": [],
            "arch_report": {},
            "security_report": {},
            "quality_report": {},
            "readme_report": {},
            "logs": [],
            "errors": [],
        }

        final_state = await graph.ainvoke(initial_state)

        # Store reports for later retrieval
        _reports[session_id] = {
            "architecture": final_state.get("arch_report", {}),
            "security": final_state.get("security_report", {}),
            "quality": final_state.get("quality_report", {}),
            "readme": final_state.get("readme_report", {}),
        }

        _status[session_id] = "complete"
        if queue:
            await queue.put({"type": "done", "data": {"message": "Analysis complete!"}})
    except Exception as e:
        _status[session_id] = "error"
        _errors[session_id] = str(e)
        if queue:
            await queue.put({"type": "error", "data": {"message": str(e)}})
        raise
    finally:
        # Clean up cloned repo from disk
        cleanup_repo(session_id)


# ---------------------------------------------------------------------------
# Chat with direct RAG (no tool calling)
# ---------------------------------------------------------------------------
async def chat_with_repo(
    session_id: str,
    question: str,
    history: list[dict],
) -> str:
    """Answer a question about the repo using direct RAG — no function calling."""
    from services.embedder import embed_text
    from services.vector_store import similarity_search, filepath_search

    llm = _llm()

    # Semantic search
    query_vec = await embed_text(question)
    sem_results = await similarity_search(query_vec, session_id, limit=12)

    # Filepath keyword search — extract meaningful words from the question
    STOP_WORDS = {"what", "where", "which", "who", "how", "is", "are", "the", "a",
                  "an", "in", "of", "for", "to", "does", "do", "file", "files",
                  "code", "this", "that", "it", "its", "with", "and", "or"}
    import re
    keywords = [re.sub(r"[^a-z0-9]", "", w.lower()) for w in question.split()]
    keywords = [w for w in keywords if w not in STOP_WORDS and len(w) > 3]
    path_results = await filepath_search(keywords, session_id, limit=4) if keywords else []

    # Prefer source code files over docs; merge path results in first
    DOC_EXTENSIONS = {".md", ".rst", ".txt", ".html", ".css"}
    seen = set()
    chosen = []

    # 1. path matches first (always source files, directly relevant)
    for r in path_results:
        if r["file_path"] not in seen:
            seen.add(r["file_path"])
            chosen.append(r)

    # 2. semantic source files
    for r in sem_results:
        if r["file_path"] not in seen and not any(r["file_path"].endswith(e) for e in DOC_EXTENSIONS):
            seen.add(r["file_path"])
            chosen.append(r)

    # 3. fall back to docs only if still nothing
    if not chosen:
        chosen = sem_results[:4]

    chosen = chosen[:5]  # cap at 5 chunks total

    # Build context block
    context_parts = []
    for r in chosen:
        if r.get("similarity", 0) < 0.1:
            continue
        context_parts.append(
            f"**File:** `{r['file_path']}` (lines {r['start_line']}-{r['end_line']})\n"
            f"```\n{r['content'][:500]}\n```"
        )
    context = "\n\n---\n\n".join(context_parts) if context_parts else "No relevant code found via search."

    # Inject architecture metadata — use compact dir summary to keep tokens low
    arch_summary = ""
    arch = _reports.get(session_id, {}).get("architecture", {})
    if arch:
        dir_summary = arch.get("dir_summary") or arch.get("folder_tree", "")[:1500]
        languages = ", ".join(arch.get("languages", {}).keys())
        frameworks = ", ".join(arch.get("frameworks", []))
        arch_summary = f"""## Repository Metadata
**Languages:** {languages or "unknown"}
**Frameworks:** {frameworks or "none detected"}
**Directory Structure:**
```
{dir_summary}
```
"""

    # Build conversation history string — last 2 exchanges only
    history_text = ""
    for msg in history[-4:]:
        role = "User" if msg["role"] == "user" else "Assistant"
        history_text += f"{role}: {msg['content']}\n"

    user_content = f"""{arch_summary}## Relevant Code Snippets

{context}

---

{history_text}User: {question}"""

    from agents.prompts import CHAT_SYSTEM_PROMPT
    return await _llm_report(llm, CHAT_SYSTEM_PROMPT, user_content)
