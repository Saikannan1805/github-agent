import asyncio
import logging
import os

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("embedder")

HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY", "")
HF_API_URL = "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction"
EMBED_DIM = 384

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


async def embed_text(text: str) -> list[float]:
    """Embed a single string via HuggingFace Inference API."""
    results = await embed_texts([text])
    return results[0]


async def embed_texts(texts: list[str], batch_size: int = 64) -> list[list[float]]:
    """Embed a list of strings in batches via HuggingFace Inference API."""
    results: list[list[float]] = []

    async with httpx.AsyncClient(timeout=60) as client:
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            embeddings = await _post_with_retry(client, batch)
            results.extend(embeddings)

    return results


def embed_dim() -> int:
    return EMBED_DIM
