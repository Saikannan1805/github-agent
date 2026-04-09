import re
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

SeverityLevel = Literal["critical", "high", "medium", "low", "info"]


@dataclass
class SecurityFinding:
    severity: SeverityLevel
    category: str
    file_path: str
    line_number: int
    line_content: str
    description: str


SECRET_PATTERNS: list[tuple[str, str, str]] = [
    # (pattern, category, description)
    (
        r'(?i)(api[_-]?key|apikey)\s*[=:]\s*["\']([A-Za-z0-9_\-]{20,})["\']',
        "Hardcoded API Key",
        "Potential hardcoded API key detected",
    ),
    (
        r'(?i)(password|passwd|pwd)\s*[=:]\s*["\']([^"\']{6,})["\']',
        "Hardcoded Password",
        "Hardcoded password value in source code",
    ),
    (
        r'(?i)(secret[_-]?key|secret)\s*[=:]\s*["\']([A-Za-z0-9_\-]{16,})["\']',
        "Hardcoded Secret",
        "Hardcoded secret key detected",
    ),
    (
        r'(?i)(token)\s*[=:]\s*["\']([A-Za-z0-9_\-\.]{20,})["\']',
        "Hardcoded Token",
        "Hardcoded token detected",
    ),
    (
        r'(?i)(aws[_-]?access[_-]?key[_-]?id)\s*[=:]\s*["\']?(AKIA[0-9A-Z]{16})["\']?',
        "AWS Access Key",
        "Hardcoded AWS access key ID",
    ),
    (
        r'(?i)(aws[_-]?secret[_-]?access[_-]?key)\s*[=:]\s*["\']([A-Za-z0-9/+=]{40})["\']',
        "AWS Secret Key",
        "Hardcoded AWS secret access key",
    ),
    (
        r'-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----',
        "Private Key",
        "Private key embedded in source code",
    ),
    (
        r'(?i)gh[pousr]_[A-Za-z0-9_]{36,}',
        "GitHub Token",
        "Hardcoded GitHub personal access token",
    ),
    (
        r'(?i)sk-[A-Za-z0-9]{32,}',
        "OpenAI API Key",
        "Hardcoded OpenAI API key",
    ),
    (
        r'(?i)AIza[0-9A-Za-z\-_]{35}',
        "Google API Key",
        "Hardcoded Google API key",
    ),
]

VULNERABILITY_PATTERNS: list[tuple[str, str, str, SeverityLevel]] = [
    # SQL Injection
    (
        r'(?i)(execute|query)\s*\(\s*[f"\'].*\%s',
        "SQL Injection",
        "String formatting in SQL query — use parameterized queries",
        "high",
    ),
    (
        r'(?i)(execute|query)\s*\(\s*f"',
        "SQL Injection",
        "f-string in SQL query — potential injection risk",
        "high",
    ),
    # Command Injection
    (
        r'(?i)(os\.system|subprocess\.call|subprocess\.run)\s*\(\s*f["\']',
        "Command Injection",
        "f-string passed to shell command — use list args instead",
        "critical",
    ),
    (
        r'(?i)shell=True',
        "Shell Injection Risk",
        "shell=True in subprocess call — prefer shell=False with list",
        "high",
    ),
    # XSS
    (
        r'(?i)dangerouslySetInnerHTML',
        "XSS Risk",
        "dangerouslySetInnerHTML usage — sanitize content",
        "high",
    ),
    (
        r'(?i)innerHTML\s*=',
        "XSS Risk",
        "Direct innerHTML assignment — potential XSS",
        "medium",
    ),
    # Insecure deserialization
    (
        r'(?i)pickle\.loads?\(',
        "Insecure Deserialization",
        "pickle.load() can execute arbitrary code with untrusted data",
        "high",
    ),
    (
        r'(?i)eval\s*\(',
        "Code Injection",
        "eval() with dynamic content can execute arbitrary code",
        "high",
    ),
    # Debug / misconfiguration
    (
        r'(?i)DEBUG\s*=\s*True',
        "Debug Mode Enabled",
        "Debug mode should not be enabled in production",
        "medium",
    ),
    (
        r'(?i)ALLOWED_HOSTS\s*=\s*\[[\s]*["\']?\*["\']?',
        "Insecure CORS/Hosts",
        "Wildcard ALLOWED_HOSTS in Django settings",
        "medium",
    ),
    # Weak crypto
    (
        r'(?i)(hashlib\.md5|hashlib\.sha1)\(',
        "Weak Cryptography",
        "MD5/SHA1 are cryptographically weak — use SHA-256 or better",
        "medium",
    ),
    # Hardcoded creds in URLs
    (
        r'(?i)(jdbc|mysql|postgresql|mongodb):\/\/[^:]+:[^@]+@',
        "Credentials in Connection String",
        "Credentials embedded in connection URL",
        "critical",
    ),
]


def _skip_line(line: str) -> bool:
    """Skip comments, env var reads, and test values."""
    stripped = line.strip()
    if stripped.startswith(("#", "//", "*", "<!--")):
        return True
    lower = line.lower()
    if any(kw in lower for kw in ["os.getenv", "os.environ", "process.env", "example", "test", "dummy", "placeholder", "your_"]):
        return True
    return False


def scan_file(file_info: dict) -> list[SecurityFinding]:
    findings: list[SecurityFinding] = []
    file_path = file_info["path"]
    lines = file_info["content"].splitlines()

    for line_num, line in enumerate(lines, 1):
        if _skip_line(line):
            continue

        # Check secret patterns (always critical)
        for pattern, category, description in SECRET_PATTERNS:
            if re.search(pattern, line):
                findings.append(
                    SecurityFinding(
                        severity="critical",
                        category=category,
                        file_path=file_path,
                        line_number=line_num,
                        line_content=line.strip()[:120],
                        description=description,
                    )
                )
                break  # one finding per line for secrets

        # Check vulnerability patterns
        for pattern, category, description, severity in VULNERABILITY_PATTERNS:
            if re.search(pattern, line):
                findings.append(
                    SecurityFinding(
                        severity=severity,
                        category=category,
                        file_path=file_path,
                        line_number=line_num,
                        line_content=line.strip()[:120],
                        description=description,
                    )
                )

    return findings


def build_security_report(files: list[dict]) -> dict:
    all_findings: list[SecurityFinding] = []

    for f in files:
        # Skip binary-ish and lock files
        if f["path"].endswith((".lock", ".sum", ".mod", "-lock.json")):
            continue
        all_findings.extend(scan_file(f))

    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
    all_findings.sort(key=lambda x: severity_order.get(x.severity, 5))

    severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    for f in all_findings:
        severity_counts[f.severity] = severity_counts.get(f.severity, 0) + 1

    risk_score = (
        severity_counts["critical"] * 10
        + severity_counts["high"] * 5
        + severity_counts["medium"] * 2
        + severity_counts["low"] * 1
    )

    return {
        "total_findings": len(all_findings),
        "severity_counts": severity_counts,
        "risk_score": min(risk_score, 100),
        "risk_level": _risk_level(risk_score),
        "findings": [
            {
                "severity": f.severity,
                "category": f.category,
                "file_path": f.file_path,
                "line_number": f.line_number,
                "line_content": f.line_content,
                "description": f.description,
            }
            for f in all_findings[:50]  # cap at 50 findings
        ],
    }


def _risk_level(score: int) -> str:
    if score >= 30:
        return "CRITICAL"
    if score >= 15:
        return "HIGH"
    if score >= 5:
        return "MEDIUM"
    if score > 0:
        return "LOW"
    return "CLEAN"
