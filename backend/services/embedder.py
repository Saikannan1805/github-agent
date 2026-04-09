import asyncio
from functools import lru_cache

from sentence_transformers import SentenceTransformer

MODEL_NAME = "all-MiniLM-L6-v2"  # 384-dim, fast, free
EMBED_DIM = 384


@lru_cache(maxsize=1)
def _get_model() -> SentenceTransformer:
    return SentenceTransformer(MODEL_NAME)


async def embed_text(text: str) -> list[float]:
    """Embed a single string."""
    loop = asyncio.get_event_loop()
    model = _get_model()
    vec = await loop.run_in_executor(
        None, lambda: model.encode(text, normalize_embeddings=True)
    )
    return vec.tolist()


async def embed_texts(texts: list[str], batch_size: int = 64) -> list[list[float]]:
    """Embed a list of strings in batches."""
    loop = asyncio.get_event_loop()
    model = _get_model()
    results: list[list[float]] = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        vecs = await loop.run_in_executor(
            None,
            lambda b=batch: model.encode(
                b, normalize_embeddings=True, show_progress_bar=False
            ),
        )
        results.extend(v.tolist() for v in vecs)

    return results


def embed_dim() -> int:
    return EMBED_DIM
