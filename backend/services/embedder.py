import os

import httpx
from dotenv import load_dotenv

load_dotenv()

HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY", "")
HF_API_URL = "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2"
EMBED_DIM = 384


async def embed_text(text: str) -> list[float]:
    """Embed a single string via HuggingFace Inference API."""
    results = await embed_texts([text])
    return results[0]


async def embed_texts(texts: list[str], batch_size: int = 64) -> list[list[float]]:
    """Embed a list of strings in batches via HuggingFace Inference API."""
    results: list[list[float]] = []
    headers = {"Authorization": f"Bearer {HF_API_KEY}"}

    async with httpx.AsyncClient(timeout=60) as client:
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            response = await client.post(
                HF_API_URL,
                headers=headers,
                json={"inputs": batch, "options": {"wait_for_model": True}},
            )
            response.raise_for_status()
            results.extend(response.json())

    return results


def embed_dim() -> int:
    return EMBED_DIM
