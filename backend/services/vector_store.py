import os

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in .env")
        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _client


async def upsert_chunks(
    chunks: list[dict],
    embeddings: list[list[float]],
    session_id: str,
    repo_url: str,
) -> None:
    """Insert code chunks with their embeddings into Supabase."""
    client = get_client()
    records = []
    for chunk, embedding in zip(chunks, embeddings):
        records.append(
            {
                "session_id": session_id,
                "repo_url": repo_url,
                "file_path": chunk["file_path"],
                "content": chunk["content"],
                "embedding": embedding,
                "start_line": chunk.get("start_line", 1),
                "end_line": chunk.get("end_line", 1),
                "metadata": {"chunk_index": chunk.get("chunk_index", 0)},
            }
        )

    batch_size = 100
    for i in range(0, len(records), batch_size):
        client.table("code_chunks").insert(records[i : i + batch_size]).execute()


async def similarity_search(
    query_embedding: list[float],
    session_id: str,
    limit: int = 6,
) -> list[dict]:
    """Search code_chunks by cosine similarity using the Supabase RPC function."""
    client = get_client()
    result = client.rpc(
        "match_code_chunks",
        {
            "query_embedding": query_embedding,
            "session_id_filter": session_id,
            "match_count": limit,
        },
    ).execute()
    return result.data or []


async def filepath_search(
    keywords: list[str],
    session_id: str,
    limit: int = 4,
) -> list[dict]:
    """Find chunks whose file_path contains any of the given keywords.
    Used to locate source files by name when semantic search returns docs."""
    client = get_client()
    found: dict[str, dict] = {}  # file_path → first chunk
    for kw in keywords:
        rows = (
            client.table("code_chunks")
            .select("id, file_path, content, start_line, end_line")
            .eq("session_id", session_id)
            .ilike("file_path", f"%{kw}%")
            .limit(limit)
            .execute()
        )
        for row in rows.data or []:
            if row["file_path"] not in found:
                row["similarity"] = 1.0  # exact path match — treat as high confidence
                found[row["file_path"]] = row
        if len(found) >= limit:
            break
    return list(found.values())[:limit]


async def delete_session_chunks(session_id: str) -> None:
    client = get_client()
    client.table("code_chunks").delete().eq("session_id", session_id).execute()
