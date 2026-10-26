import asyncio
import logging
import os
import threading
from typing import Awaitable, Callable

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("embedder")

HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY", "")
HF_API_URL = "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction"
EMBED_DIM = 384

# "local" (default) runs the model in-process via fastembed (ONNX, no torch — small
# enough for Render's free tier); "hf" uses the HuggingFace Inference API instead
EMBEDDINGS_BACKEND = os.getenv("EMBEDDINGS_BACKEND", "local").lower()
LOCAL_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
LOCAL_BATCH_SIZE = 1  # peak RAM grows steeply with batch size (~+30 MB at 1 vs ~+230 MB at 8)
_local_model = None
_local_model_lock = threading.Lock()  # concurrent analyses must not load the model twice

MAX_RETRIES = 4
RETRY_DELAYS = [2, 5, 10, 20]  # seconds between retries


async def _post_with_retry(client: httpx.AsyncClient, batch: list[str]) -> list[list[float]]:
    """POST a batch to HF API with exponential backoff on rate limits / server errors."""
    headers = {"Authorization": f"Bearer {HF_API_KEY}"}
    last_error: Exception | None = None

    for attempt in range(MAX_RETRIES):
        try:
            response = await client.post(
                HF_API_URL,
                headers=headers,
                json={"inputs": batch, "options": {"wait_for_model": True}},
            )

            if response.status_code == 429:
                wait = RETRY_DELAYS[min(attempt, len(RETRY_DELAYS) - 1)]
                logger.warning(f"HF rate limited — retrying in {wait}s (attempt {attempt + 1}/{MAX_RETRIES})")
                await asyncio.sleep(wait)
                continue

            if response.status_code == 503:
                wait = RETRY_DELAYS[min(attempt, len(RETRY_DELAYS) - 1)]
                logger.warning(f"HF model loading — retrying in {wait}s (attempt {attempt + 1}/{MAX_RETRIES})")
                await asyncio.sleep(wait)
                continue

            response.raise_for_status()
            return response.json()

        except httpx.TimeoutException as e:
            wait = RETRY_DELAYS[min(attempt, len(RETRY_DELAYS) - 1)]
            logger.warning(f"HF request timed out — retrying in {wait}s (attempt {attempt + 1}/{MAX_RETRIES})")
            last_error = e
            await asyncio.sleep(wait)

        except httpx.HTTPStatusError as e:
            last_error = e
            # Don't retry on 4xx client errors (except 429 handled above)
            if e.response.status_code < 500:
                raise
            wait = RETRY_DELAYS[min(attempt, len(RETRY_DELAYS) - 1)]
            logger.warning(f"HF server error {e.response.status_code} — retrying in {wait}s")
            await asyncio.sleep(wait)

    raise last_error or RuntimeError("HF embedding failed after all retries")


LOCAL_PROGRESS_SLICE = 16  # texts per worker-thread call, so progress can be reported between slices

ProgressCallback = Callable[[int, int], Awaitable[None]]  # (done, total)


def _load_local_model():
    global _local_model
    with _local_model_lock:
        if _local_model is None:
            from fastembed import TextEmbedding

            logger.info(f"Loading local embedding model {LOCAL_MODEL_NAME}")
            _local_model = TextEmbedding(LOCAL_MODEL_NAME, threads=1, enable_cpu_mem_arena=False)
    return _local_model


def _encode_local(texts: list[str]) -> list[list[float]]:
    model = _load_local_model()
    return [e.tolist() for e in model.embed(texts, batch_size=LOCAL_BATCH_SIZE)]


async def warm_up() -> None:
    """Download/load the local model ahead of the first analysis (no-op in HF mode)."""
    if EMBEDDINGS_BACKEND == "local":
        await asyncio.to_thread(_load_local_model)
        logger.info("Local embedding model ready")


async def embed_text(text: str) -> list[float]:
    """Embed a single string."""
    results = await embed_texts([text])
    return results[0]


async def embed_texts(
    texts: list[str],
    batch_size: int = 64,
    on_progress: ProgressCallback | None = None,
) -> list[list[float]]:
    """Embed a list of strings (locally or via HuggingFace Inference API, per EMBEDDINGS_BACKEND)."""
    results: list[list[float]] = []

    if EMBEDDINGS_BACKEND == "local":
        for i in range(0, len(texts), LOCAL_PROGRESS_SLICE):
            results.extend(await asyncio.to_thread(_encode_local, texts[i : i + LOCAL_PROGRESS_SLICE]))
            if on_progress:
                await on_progress(len(results), len(texts))
        return results

    async with httpx.AsyncClient(timeout=60) as client:
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            embeddings = await _post_with_retry(client, batch)
            results.extend(embeddings)
            if on_progress:
                await on_progress(len(results), len(texts))

    return results


def embed_dim() -> int:
    return EMBED_DIM
