from pathlib import Path

CHUNK_LINES = 80
OVERLAP_LINES = 10


def chunk_file(file_info: dict, chunk_lines: int = CHUNK_LINES, overlap: int = OVERLAP_LINES) -> list[dict]:
    """Split a file into overlapping line-based chunks."""
    content = file_info["content"]
    file_path = file_info["path"]
    lines = content.splitlines()
    total = len(lines)

    if total == 0:
        return []

    if total <= chunk_lines:
        return [
            {
                "content": content,
                "file_path": file_path,
                "start_line": 1,
                "end_line": total,
                "chunk_index": 0,
                "extension": file_info.get("extension", ""),
            }
        ]

    chunks = []
    chunk_index = 0
    i = 0
    while i < total:
        end = min(i + chunk_lines, total)
        chunk_content = "\n".join(lines[i:end])
        chunks.append(
            {
                "content": chunk_content,
                "file_path": file_path,
                "start_line": i + 1,
                "end_line": end,
                "chunk_index": chunk_index,
                "extension": file_info.get("extension", ""),
            }
        )
        chunk_index += 1
        i += chunk_lines - overlap
        if end == total:
            break

    return chunks


def chunk_all_files(files: list[dict]) -> list[dict]:
    """Chunk every file in the list."""
    all_chunks: list[dict] = []
    for f in files:
        all_chunks.extend(chunk_file(f))
    return all_chunks


def get_file_summary(files: list[dict]) -> dict:
    """Aggregate stats about the repo files."""
    ext_counts: dict[str, int] = {}
    total_lines = 0
    total_size = 0

    for f in files:
        ext = f.get("extension", "unknown") or "unknown"
        ext_counts[ext] = ext_counts.get(ext, 0) + 1
        total_lines += f.get("lines", 0)
        total_size += f.get("size", 0)

    return {
        "total_files": len(files),
        "total_lines": total_lines,
        "total_size_kb": round(total_size / 1024, 1),
        "by_extension": dict(sorted(ext_counts.items(), key=lambda x: -x[1])),
    }
