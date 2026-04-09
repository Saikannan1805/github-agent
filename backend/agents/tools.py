"""LangGraph-compatible tools for the chat agent."""

from langchain_core.tools import tool

from services.embedder import embed_text
from services.vector_store import similarity_search


def make_search_tool(session_id: str):
    """Factory that returns a codebase search tool bound to a session."""

    @tool
    async def search_codebase(query: str) -> str:
        """Search the repository codebase for code relevant to the query.
        Returns code snippets with file paths and line numbers.
        Use this to answer questions about specific functionality, patterns, or implementations.

        Args:
            query: A natural language question or keyword about the codebase
        """
        query_vec = await embed_text(query)
        results = await similarity_search(query_vec, session_id, limit=5)

        if not results:
            return "No relevant code found for that query."

        parts = []
        for r in results:
            similarity = r.get("similarity", 0)
            if similarity < 0.3:
                continue
            parts.append(
                f"**File:** `{r['file_path']}` (lines {r['start_line']}-{r['end_line']}, similarity: {similarity:.2f})\n"
                f"```\n{r['content'][:800]}\n```"
            )

        return "\n\n---\n\n".join(parts) if parts else "No sufficiently relevant code found."

    return search_codebase
