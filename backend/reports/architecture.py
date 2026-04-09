from pathlib import Path


FRAMEWORK_SIGNALS: dict[str, list[str]] = {
    "FastAPI": ["fastapi", "from fastapi"],
    "Django": ["django", "from django"],
    "Flask": ["flask", "from flask"],
    "Express.js": ["express", "require('express')", 'require("express")'],
    "Next.js": ["next/", '"next"', "from 'next'"],
    "React": ["react", "from 'react'", 'from "react"'],
    "Vue.js": ["vue", "from 'vue'"],
    "Angular": ["@angular/"],
    "Svelte": [".svelte", "from 'svelte'"],
    "Spring Boot": ["spring-boot", "@SpringBootApplication"],
    "Rails": ["rails", "ActionController"],
    "Laravel": ["laravel", "Illuminate\\"],
    "LangChain": ["langchain", "from langchain"],
    "LangGraph": ["langgraph", "from langgraph"],
    "SQLAlchemy": ["sqlalchemy", "from sqlalchemy"],
    "Prisma": ["@prisma/client", "prisma"],
    "Docker": ["Dockerfile", "docker-compose"],
    "Kubernetes": [".yaml", "apiVersion:", "kind: Deployment"],
    "Terraform": [".tf", "terraform {"],
    "GraphQL": ["graphql", "gql`"],
}

LANGUAGE_MAP: dict[str, str] = {
    ".py": "Python",
    ".js": "JavaScript",
    ".ts": "TypeScript",
    ".jsx": "JavaScript (JSX)",
    ".tsx": "TypeScript (TSX)",
    ".java": "Java",
    ".go": "Go",
    ".rs": "Rust",
    ".cpp": "C++",
    ".c": "C",
    ".cs": "C#",
    ".rb": "Ruby",
    ".php": "PHP",
    ".swift": "Swift",
    ".kt": "Kotlin",
    ".scala": "Scala",
    ".r": "R",
    ".sh": "Shell",
    ".sql": "SQL",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".vue": "Vue",
    ".svelte": "Svelte",
    ".tf": "Terraform",
    ".yaml": "YAML",
    ".yml": "YAML",
}


def detect_languages(files: list[dict]) -> dict[str, int]:
    lang_counts: dict[str, int] = {}
    for f in files:
        lang = LANGUAGE_MAP.get(f.get("extension", ""), None)
        if lang:
            lang_counts[lang] = lang_counts.get(lang, 0) + f.get("lines", 0)
    return dict(sorted(lang_counts.items(), key=lambda x: -x[1]))


def detect_frameworks(files: list[dict]) -> list[str]:
    all_content = ""
    filenames = set()
    for f in files:
        all_content += f.get("content", "")[:2000]  # sample first 2KB
        filenames.add(Path(f["path"]).name)

    detected = []
    for framework, signals in FRAMEWORK_SIGNALS.items():
        if any(s in all_content or s in filenames for s in signals):
            detected.append(framework)
    return detected


def build_folder_tree(files: list[dict], max_depth: int = 3) -> dict:
    tree: dict = {}
    for f in files:
        parts = Path(f["path"]).parts
        node = tree
        for depth, part in enumerate(parts[:-1]):
            if depth >= max_depth:
                break
            node = node.setdefault(part, {})
        node[parts[-1]] = None  # leaf
    return tree


def format_tree(tree: dict, indent: int = 0) -> str:
    lines = []
    for key, val in sorted(tree.items()):
        prefix = "  " * indent + ("📁 " if isinstance(val, dict) else "📄 ")
        lines.append(f"{prefix}{key}")
        if isinstance(val, dict):
            lines.append(format_tree(val, indent + 1))
    return "\n".join(lines)


def format_dir_summary(files: list[dict]) -> str:
    """Compact directory-only summary: shows all folders + root-level files.
    Much smaller than the full tree — safe to include in every chat prompt."""
    dirs: set[str] = set()
    root_files: list[str] = []
    for f in files:
        parts = Path(f["path"]).parts
        if len(parts) == 1:
            root_files.append(parts[0])
        else:
            dirs.add(parts[0])  # top-level dir
            if len(parts) > 2:
                dirs.add(f"{parts[0]}/{parts[1]}")  # one level deep

    lines = ["Root files: " + ", ".join(sorted(root_files)[:20])]
    for d in sorted(dirs):
        lines.append(f"📁 {d}/")
    return "\n".join(lines)


def detect_patterns(files: list[dict]) -> list[str]:
    patterns = []
    paths = [f["path"] for f in files]
    path_str = " ".join(paths)

    if any("test" in p.lower() or "spec" in p.lower() for p in paths):
        patterns.append("Testing (test/spec files detected)")
    if any("docker" in p.lower() for p in paths):
        patterns.append("Containerization (Docker)")
    if any(".github" in p for p in paths):
        patterns.append("GitHub Actions CI/CD")
    if any("migration" in p.lower() for p in paths):
        patterns.append("Database Migrations")
    if any("middleware" in p.lower() for p in paths):
        patterns.append("Middleware Pattern")
    if any(p in path_str for p in ["controllers/", "models/", "views/"]):
        patterns.append("MVC Architecture")
    if any("service" in p.lower() for p in paths):
        patterns.append("Service Layer Pattern")
    if any("repository" in p.lower() or "repo" in p.lower() for p in paths):
        patterns.append("Repository Pattern")
    if any("api/" in p or "/api" in p for p in paths):
        patterns.append("REST API Structure")

    return patterns


def build_architecture_report(files: list[dict], repo_url: str) -> dict:
    stats = {
        "total_files": len(files),
        "total_lines": sum(f.get("lines", 0) for f in files),
        "total_size_kb": round(sum(f.get("size", 0) for f in files) / 1024, 1),
    }
    return {
        "repo_url": repo_url,
        "stats": stats,
        "languages": detect_languages(files),
        "frameworks": detect_frameworks(files),
        "patterns": detect_patterns(files),
        "folder_tree": format_tree(build_folder_tree(files)),
        "entry_points": _find_entry_points(files),
    }


def _find_entry_points(files: list[dict]) -> list[str]:
    entry_names = {
        "main.py", "app.py", "server.py", "index.js", "index.ts",
        "main.go", "main.rs", "main.java", "App.tsx", "App.jsx",
        "manage.py", "wsgi.py", "asgi.py",
    }
    return [
        f["path"]
        for f in files
        if Path(f["path"]).name in entry_names
    ]
