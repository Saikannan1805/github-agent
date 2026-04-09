"""
GitHub Repository Analyzer — FastAPI Backend
"""

import asyncio
import json
import logging
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator

logging.basicConfig(level=logging.INFO, format="%(levelname)s: [%(name)s] %(message)s")

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, HttpUrl

load_dotenv()

from agents.orchestrator import (
    chat_with_repo,
    cleanup_expired_sessions,
    create_session_queue,
    get_error,
    get_reports,
    get_session_queue,
    get_status,
    run_analysis,
)


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
CLEANUP_INTERVAL_SECONDS = 30 * 60  # run every 30 minutes


async def _cleanup_loop() -> None:
    """Background task: purge expired sessions from Supabase and memory."""
    logger = logging.getLogger("cleanup")
    while True:
        await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)
        try:
            purged = await cleanup_expired_sessions()
            if purged:
                logger.info(f"TTL cleanup: removed {len(purged)} session(s): {purged}")
        except Exception as e:
            logger.warning(f"TTL cleanup error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start TTL-based session cleanup loop
    cleanup_task = asyncio.create_task(_cleanup_loop())
    yield
    cleanup_task.cancel()


app = FastAPI(
    title="GitHub Repo Analyzer API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class AnalyzeRequest(BaseModel):
    repo_url: str


class ChatRequest(BaseModel):
    session_id: str
    question: str
    history: list[dict] = []

# ---------------------------------------------------------------------------
# SSE helper
# ---------------------------------------------------------------------------
async def sse_generator(session_id: str) -> AsyncGenerator[str, None]:
    """Yield SSE-formatted events from the session queue."""
    queue = get_session_queue(session_id)
    if queue is None:
        yield _sse_event({"type": "error", "data": {"message": "Session not found"}})
        return

    timeout = 600  # max 10 minutes
    elapsed = 0
    poll_interval = 0.3

    while elapsed < timeout:
        try:
            event = queue.get_nowait()
            yield _sse_event(event)
            if event["type"] in ("done", "error"):
                await asyncio.sleep(0.3)  # let browser receive the event before stream closes
                break
        except asyncio.QueueEmpty:
            await asyncio.sleep(poll_interval)
            elapsed += poll_interval
            # Send keep-alive ping every 15s
            if int(elapsed) % 15 == 0:
                yield ": ping\n\n"

    if elapsed >= timeout:
        yield _sse_event({"type": "error", "data": {"message": "Analysis timed out"}})


def _sse_event(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/analyze")
async def analyze(req: AnalyzeRequest, background_tasks: BackgroundTasks):
    """Start repo analysis. Returns a session_id for SSE streaming."""
    repo_url = str(req.repo_url).rstrip("/")

    # Basic validation
    if "github.com" not in repo_url:
        raise HTTPException(400, "Only GitHub URLs are supported")

    session_id = str(uuid.uuid4())
    create_session_queue(session_id)

    background_tasks.add_task(run_analysis, session_id, repo_url)

    return {"session_id": session_id, "status": "started"}


@app.get("/stream/{session_id}")
async def stream(session_id: str):
    """SSE endpoint — stream analysis events in real time."""
    return StreamingResponse(
        sse_generator(session_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@app.get("/reports/{session_id}")
async def get_all_reports(session_id: str):
    """Return all generated reports for a session."""
    status = get_status(session_id)
    if status == "unknown":
        raise HTTPException(404, "Session not found")
    reports = get_reports(session_id)
    return {"session_id": session_id, "status": status, "reports": reports}


@app.post("/chat")
async def chat(req: ChatRequest):
    """RAG-powered Q&A about the repository."""
    status = get_status(req.session_id)
    if status == "unknown":
        raise HTTPException(404, "Session not found — run /analyze first")
    if status == "running":
        raise HTTPException(409, "Analysis still running — wait for completion")

    try:
        answer = await chat_with_repo(
            session_id=req.session_id,
            question=req.question,
            history=req.history,
        )
        return {"answer": answer, "session_id": req.session_id}
    except Exception as e:
        raise HTTPException(500, f"Chat error: {e}")


@app.get("/status/{session_id}")
async def status(session_id: str):
    return {
        "session_id": session_id,
        "status": get_status(session_id),
        "error": get_error(session_id),
    }
