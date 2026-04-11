import asyncio
import os
import shutil
from pathlib import Path

import subprocess

from dotenv import load_dotenv

load_dotenv()

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")

CODE_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".go", ".rs", ".cpp",
    ".c", ".h", ".hpp", ".cs", ".rb", ".php", ".swift", ".kt", ".scala",
    ".r", ".sh", ".bash", ".yaml", ".yml", ".json", ".toml", ".sql",
    ".html", ".css", ".scss", ".vue", ".svelte", ".md",
    ".tf", ".hcl", ".dockerfile", ".gradle", ".xml", ".ini", ".cfg",
}

EXCLUDE_DIRS = {
    "node_modules", ".git", "__pycache__", ".venv", "venv", "env",
    "dist", "build", ".next", ".nuxt", "coverage", ".pytest_cache",
    ".mypy_cache", "target", "vendor", "bower_components", ".idea",
    ".vscode", "out", "tmp", "temp", "logs",
}

MAX_FILE_SIZE = 500 * 1024   # 500 KB per file
MAX_FILES = 500              # max files to analyze
MAX_TOTAL_LINES = 100_000    # max total lines of code


async def clone_repo(repo_url: str, session_id: str) -> tuple[str, list[dict]]:
    """Clone a GitHub repo (shallow) and return (path, file_list, failed_list)."""
    clone_path = f"/tmp/repos/{session_id}"

    if os.path.exists(clone_path):
        shutil.rmtree(clone_path)
    os.makedirs(clone_path, exist_ok=True)

    auth_url = repo_url
    if GITHUB_TOKEN and "github.com" in repo_url:
        auth_url = repo_url.replace("https://", f"https://{GITHUB_TOKEN}@")

    loop = asyncio.get_event_loop()
    proc = await loop.run_in_executor(
        None,
        lambda: subprocess.run(
            ["git", "clone", "--depth=1", "--single-branch", auth_url, clone_path],
            capture_output=True,
            text=True,
        ),
    )
    if proc.returncode != 0:
        raise RuntimeError(f"git clone failed: {proc.stderr.strip()}")

    files, failed = await _collect_files(clone_path)

    # Validate repo size after collection
    total_lines = sum(f["lines"] for f in files)
    if len(files) > MAX_FILES:
        cleanup_repo(session_id)
        raise ValueError(
            f"Repo too large — {len(files)} files found (max {MAX_FILES}). "
            "Try a smaller or more focused repository."
        )
    if total_lines > MAX_TOTAL_LINES:
        cleanup_repo(session_id)
        raise ValueError(
            f"Repo too large — {total_lines:,} lines of code (max {MAX_TOTAL_LINES:,}). "
            "Try a smaller or more focused repository."
        )

    return clone_path, files, failed


SPECIAL_NAMES = {
    "Dockerfile", "Makefile", ".gitignore", ".dockerignore", ".env.example",
}


async def _collect_files(repo_path: str) -> tuple[list[dict], list[str]]:
    """Walk the repo and return (code file list, list of failed paths)."""
    files: list[dict] = []
    failed: list[str] = []
    root = Path(repo_path)

    for file_path in root.rglob("*"):
        if not (file_path.is_file() or (file_path.is_symlink() and file_path.resolve().is_file())):
            continue
        if any(excl in file_path.relative_to(root).parts for excl in EXCLUDE_DIRS):
            continue
        if file_path.suffix.lower() not in CODE_EXTENSIONS and file_path.name not in SPECIAL_NAMES:
            continue
        try:
            size = file_path.stat().st_size
            if size == 0 or size > MAX_FILE_SIZE:
                continue
            content = file_path.read_text(encoding="utf-8", errors="ignore")
            rel = str(file_path.relative_to(root))
            files.append(
                {
                    "path": rel,
                    "content": content,
                    "size": size,
                    "extension": file_path.suffix.lower(),
                    "lines": len(content.splitlines()),
                }
            )
        except Exception as e:
            failed.append(f"{file_path}: {e}")
            continue

    return files, failed


def get_repo_structure(files: list[dict]) -> dict:
    """Build a nested dict representing the folder tree."""
    tree: dict = {}
    for f in files:
        parts = Path(f["path"]).parts
        node = tree
        for part in parts[:-1]:
            node = node.setdefault(part, {})
        node[parts[-1]] = f["lines"]
    return tree


def cleanup_repo(session_id: str) -> None:
    clone_path = f"/tmp/repos/{session_id}"
    if os.path.exists(clone_path):
        shutil.rmtree(clone_path, ignore_errors=True)
