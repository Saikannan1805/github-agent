import re
from pathlib import Path


def _count_todos(content: str) -> int:
    return len(re.findall(r"(?i)\b(TODO|FIXME|HACK|XXX|BUG|TEMP)\b", content))


def _count_functions(content: str, ext: str) -> int:
    if ext in (".py",):
        return len(re.findall(r"^\s*(?:async\s+)?def\s+\w+", content, re.MULTILINE))
    if ext in (".js", ".ts", ".jsx", ".tsx"):
        return len(
            re.findall(
                r"(?:function\s+\w+|\w+\s*=\s*(?:async\s*)?\(.*?\)\s*=>|(?:async\s+)?(?:function\s*)?\w+\s*\()",
                content,
            )
        )
    if ext == ".go":
        return len(re.findall(r"^func\s+\w+", content, re.MULTILINE))
    if ext == ".java":
        return len(re.findall(r"(?:public|private|protected|static)\s+\w+\s+\w+\s*\(", content))
    return 0


def _count_classes(content: str, ext: str) -> int:
    if ext == ".py":
        return len(re.findall(r"^class\s+\w+", content, re.MULTILINE))
    if ext in (".js", ".ts", ".jsx", ".tsx"):
        return len(re.findall(r"(?:^|\s)class\s+\w+", content, re.MULTILINE))
    if ext == ".java":
        return len(re.findall(r"(?:public|private)?\s*class\s+\w+", content))
    if ext == ".go":
        return len(re.findall(r"^type\s+\w+\s+struct", content, re.MULTILINE))
    return 0


def _comment_ratio(content: str, ext: str) -> float:
    lines = content.splitlines()
    if not lines:
        return 0.0
    if ext in (".py",):
        comment_lines = sum(1 for l in lines if l.strip().startswith("#"))
    elif ext in (".js", ".ts", ".jsx", ".tsx", ".java", ".go", ".cpp", ".c", ".cs"):
        comment_lines = sum(
            1 for l in lines if l.strip().startswith("//") or l.strip().startswith("/*")
        )
    else:
        return 0.0
    return round(comment_lines / len(lines), 3)


def _estimate_complexity(content: str, ext: str) -> str:
    """Rough cyclomatic complexity estimate based on branch keywords."""
    if ext not in (".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".go", ".cs", ".cpp", ".rb"):
        return "N/A"
    branches = len(
        re.findall(
            r"\b(if|elif|else|for|while|case|except|catch|&&|\|\|)\b",
            content,
        )
    )
    funcs = max(_count_functions(content, ext), 1)
    avg = branches / funcs
    if avg < 3:
        return "Low"
    if avg < 7:
        return "Medium"
    if avg < 12:
        return "High"
    return "Very High"


def _detect_dead_code(content: str, ext: str) -> list[str]:
    hints = []
    if ext == ".py":
        unused_imports = re.findall(r"^import\s+(\w+)(?:\s+#.*)?$", content, re.MULTILINE)
        for imp in unused_imports:
            if content.count(imp) == 1:  # only the import line
                hints.append(f"Possibly unused import: {imp}")
    commented_blocks = len(re.findall(r"(?m)^[ \t]*#{2,}", content))
    if commented_blocks > 3:
        hints.append(f"Large commented-out blocks detected ({commented_blocks} blocks)")
    return hints[:5]


def _is_test_file(file_path: str) -> bool:
    p = file_path.lower()
    return any(kw in p for kw in ["test_", "_test", "spec_", "_spec", "/tests/", "/test/", "/spec/"])


def analyze_file(file_info: dict) -> dict:
    content = file_info["content"]
    ext = file_info.get("extension", "")
    path = file_info["path"]

    return {
        "path": path,
        "lines": file_info.get("lines", 0),
        "functions": _count_functions(content, ext),
        "classes": _count_classes(content, ext),
        "todos": _count_todos(content),
        "comment_ratio": _comment_ratio(content, ext),
        "complexity": _estimate_complexity(content, ext),
        "dead_code_hints": _detect_dead_code(content, ext),
        "is_test": _is_test_file(path),
    }


def build_quality_report(files: list[dict]) -> dict:
    file_analyses = [analyze_file(f) for f in files]

    total_lines = sum(a["lines"] for a in file_analyses)
    total_functions = sum(a["functions"] for a in file_analyses)
    total_classes = sum(a["classes"] for a in file_analyses)
    total_todos = sum(a["todos"] for a in file_analyses)
    test_files = sum(1 for a in file_analyses if a["is_test"])

    avg_comment_ratio = (
        round(
            sum(a["comment_ratio"] for a in file_analyses) / len(file_analyses), 3
        )
        if file_analyses
        else 0
    )

    complexity_dist = {"Low": 0, "Medium": 0, "High": 0, "Very High": 0, "N/A": 0}
    for a in file_analyses:
        c = a["complexity"]
        complexity_dist[c] = complexity_dist.get(c, 0) + 1

    all_hints = []
    for a in file_analyses:
        for hint in a["dead_code_hints"]:
            all_hints.append({"file": a["path"], "hint": hint})

    # Top 10 largest files
    largest = sorted(file_analyses, key=lambda x: -x["lines"])[:10]

    # Files with most TODOs
    todo_files = sorted(
        [a for a in file_analyses if a["todos"] > 0],
        key=lambda x: -x["todos"],
    )[:10]

    test_ratio = round(test_files / max(len(files), 1), 3)
    quality_score = _compute_score(
        avg_comment_ratio, test_ratio, total_todos, len(files), complexity_dist
    )

    return {
        "summary": {
            "total_files": len(files),
            "total_lines": total_lines,
            "total_functions": total_functions,
            "total_classes": total_classes,
            "total_todos": total_todos,
            "test_files": test_files,
            "test_coverage_ratio": test_ratio,
            "avg_comment_ratio": avg_comment_ratio,
            "quality_score": quality_score,
            "quality_grade": _grade(quality_score),
        },
        "complexity_distribution": complexity_dist,
        "largest_files": [{"path": a["path"], "lines": a["lines"]} for a in largest],
        "todo_hotspots": [{"path": a["path"], "todos": a["todos"]} for a in todo_files],
        "dead_code_hints": all_hints[:20],
    }


def _compute_score(comment_ratio, test_ratio, todos, total_files, complexity_dist) -> int:
    score = 100
    score -= min(int(todos / max(total_files, 1) * 20), 20)
    if test_ratio < 0.1:
        score -= 20
    elif test_ratio < 0.2:
        score -= 10
    if comment_ratio < 0.05:
        score -= 10
    high_complexity = complexity_dist.get("High", 0) + complexity_dist.get("Very High", 0)
    score -= min(high_complexity * 3, 20)
    return max(score, 0)


def _grade(score: int) -> str:
    if score >= 90:
        return "A"
    if score >= 75:
        return "B"
    if score >= 60:
        return "C"
    if score >= 40:
        return "D"
    return "F"
