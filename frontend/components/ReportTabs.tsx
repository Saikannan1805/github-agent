"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import JSZip from "jszip";
import type { Reports } from "@/app/page";

interface Props {
  reports: Reports;
  repoUrl?: string;
}

type TabKey = "architecture" | "security" | "quality" | "readme";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  {
    key: "architecture",
    label: "Architecture",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    key: "security",
    label: "Security",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    key: "quality",
    label: "Code Quality",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    key: "readme",
    label: "Auto README",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

// ---- Markdown formatters ----

function repoName(repoUrl?: string): string {
  if (!repoUrl) return "repo";
  const parts = repoUrl.replace(/\/$/, "").split("/");
  return parts[parts.length - 1] || "repo";
}

function formatArchitectureMd(data: Record<string, any>, repoUrl?: string): string {
  const stats = data.stats as Record<string, unknown> || {};
  const languages = data.languages as Record<string, number> || {};
  const frameworks = (data.frameworks as string[]) || [];
  const patterns = (data.patterns as string[]) || [];

  const langLines = Object.entries(languages)
    .map(([lang, lines]) => `| ${lang} | ${Number(lines).toLocaleString()} |`)
    .join("\n");

  const findingsList = patterns.map((p) => `- ${p}`).join("\n");

  return `# Architecture Report — ${repoUrl || "Repository"}

## Stats
| Metric | Value |
|---|---|
| Files | ${stats.total_files ?? "—"} |
| Lines of Code | ${Number(stats.total_lines ?? 0).toLocaleString()} |
| Size | ${stats.total_size_kb ?? "—"} KB |

## Languages
| Language | Lines |
|---|---|
${langLines || "| — | — |"}

## Frameworks & Libraries
${frameworks.length > 0 ? frameworks.map((f) => `- ${f}`).join("\n") : "_None detected_"}

## Detected Patterns
${findingsList || "_None detected_"}

## Folder Structure
\`\`\`
${data.folder_tree || ""}
\`\`\`

## AI Analysis
${data.ai_analysis || ""}
`;
}

function formatSecurityMd(data: Record<string, any>, repoUrl?: string): string {
  const counts = data.severity_counts as Record<string, number> || {};
  const findings = (data.findings as Array<Record<string, unknown>>) || [];

  const findingBlocks = findings
    .map(
      (f, i) =>
        `### ${i + 1}. [${String(f.severity).toUpperCase()}] ${f.category}\n` +
        `- **File:** \`${f.file_path}:${f.line_number}\`\n` +
        `- **Description:** ${f.description}\n` +
        (f.line_content ? `- **Code:** \`${f.line_content}\`` : "")
    )
    .join("\n\n");

  return `# Security Report — ${repoUrl || "Repository"}

## Risk Overview
- **Risk Level:** ${data.risk_level ?? "—"}
- **Risk Score:** ${data.risk_score ?? "—"}/100
- **Total Findings:** ${data.total_findings ?? 0}

## Severity Breakdown
| Severity | Count |
|---|---|
| Critical | ${counts.critical ?? 0} |
| High | ${counts.high ?? 0} |
| Medium | ${counts.medium ?? 0} |
| Low | ${counts.low ?? 0} |

## Findings
${findingBlocks || "_No issues found — clean codebase ✓_"}

## AI Security Assessment
${data.ai_analysis || ""}
`;
}

function formatQualityMd(data: Record<string, any>, repoUrl?: string): string {
  const summary = (data.summary as Record<string, unknown>) || {};
  const largestFiles = (data.largest_files as Array<{ path: string; lines: number }>) || [];

  const fileRows = largestFiles
    .map((f) => `| \`${f.path}\` | ${f.lines.toLocaleString()} |`)
    .join("\n");

  return `# Code Quality Report — ${repoUrl || "Repository"}

## Grade: ${summary.quality_grade ?? "?"} (${summary.quality_score ?? 0}/100)

## Summary
| Metric | Value |
|---|---|
| Total Files | ${summary.total_files ?? "—"} |
| Total Lines | ${Number(summary.total_lines ?? 0).toLocaleString()} |
| Functions | ${summary.total_functions ?? "—"} |
| Classes | ${summary.total_classes ?? "—"} |
| TODOs / FIXMEs | ${summary.total_todos ?? "—"} |
| Test Files | ${summary.test_files ?? "—"} |
| Test Coverage Ratio | ${((Number(summary.test_coverage_ratio ?? 0)) * 100).toFixed(0)}% |
| Comment Ratio | ${((Number(summary.avg_comment_ratio ?? 0)) * 100).toFixed(0)}% |

## Largest Files
| File | Lines |
|---|---|
${fileRows || "| — | — |"}

## AI Quality Assessment
${data.ai_analysis || ""}
`;
}

function formatReadmeMd(data: Record<string, any>): string {
  return String(data.content || "");
}

function getMarkdown(key: TabKey, data: Record<string, any>, repoUrl?: string): string {
  if (key === "architecture") return formatArchitectureMd(data, repoUrl);
  if (key === "security") return formatSecurityMd(data, repoUrl);
  if (key === "quality") return formatQualityMd(data, repoUrl);
  return formatReadmeMd(data);
}

function getPlainText(key: TabKey, data: Record<string, any>, repoUrl?: string): string {
  // Strip markdown symbols from the md version for a clean plain text output
  return getMarkdown(key, data, repoUrl)
    .replace(/#{1,6}\s/g, "")        // headings
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/\*(.+?)\*/g, "$1")     // italic
    .replace(/`{1,3}[^`]*`{1,3}/g, (m) => m.replace(/`/g, "")) // code
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // links
    .replace(/^\|.*\|$/gm, (row) =>     // table rows → tab-separated
      row.split("|").filter(Boolean).map((c) => c.trim()).join("\t")
    )
    .replace(/^[-*]\s/gm, "• ")      // bullet points
    .replace(/\n{3,}/g, "\n\n")      // collapse excess blank lines
    .trim();
}

// ---- Download helpers ----

function triggerDownload(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}


// ---- JSON developer panel ----

const DEV_TABS = [
  {
    label: "CI/CD",
    filename: "ci-check.js",
    explanation: "Paste this into your pipeline. It reads the downloaded JSON and exits with an error code if the risk level is CRITICAL. This automatically blocks the merge in GitHub Actions, GitLab CI or any CI tool.",
    snippet: `// ci-check.js — add this as a pipeline step
const report = require('./gitwise-security.json');

if (report.risk_level === 'CRITICAL') {
  console.error('❌ Critical security issues found!');
  console.error('   Findings:', report.total_findings);
  process.exit(1); // non-zero exit blocks the merge
}

console.log('✅ Security check passed:', report.risk_level);
console.log('   Total findings:', report.total_findings);`,
  },
  {
    label: "PR Review",
    filename: ".github/workflows/gitwise.yml",
    explanation: "First, commit your downloaded JSON files (gitwise-quality.json and gitwise-security.json) to the repo root. Then this GitHub Actions workflow runs on every pull request — it reads those files and posts a formatted summary comment directly on the PR so reviewers see the grade and findings without leaving GitHub.",
    snippet: `name: Gitwise Code Review
on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Post Gitwise report as PR comment
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: |
          GRADE=$(cat gitwise-quality.json | jq -r '.summary.quality_grade')
          SCORE=$(cat gitwise-quality.json | jq '.summary.quality_score')
          RISK=$(cat gitwise-security.json | jq -r '.risk_level')
          FINDINGS=$(cat gitwise-security.json | jq '.total_findings')

          gh pr comment \${{ github.event.pull_request.number }} --body "
          ## Gitwise Report
          | Metric | Result |
          |---|---|
          | Quality Grade | \${GRADE} (\${SCORE}/100) |
          | Security Risk | \${RISK} |
          | Findings | \${FINDINGS} |
          "`,
  },
  {
    label: "Quality Tracking",
    filename: "track-quality.js",
    explanation: "Reads the quality and security JSONs and logs a structured snapshot — grade, score, risk level, test ratio, issue count, timestamp. Schedule it on every merge to main to track trends over time. Pipe the output to Supabase, Postgres, a webhook, or any monitoring tool.",
    snippet: `// track-quality.js
// Run: node track-quality.js
// Pipe output to any DB or webhook
const fs = require("fs");

const quality  = JSON.parse(fs.readFileSync("gitwise-quality.json"));
const security = JSON.parse(fs.readFileSync("gitwise-security.json"));

const snapshot = {
  quality_grade: quality.summary.quality_grade,   // e.g. "A"
  quality_score: quality.summary.quality_score,   // e.g. 89
  risk_level:    security.risk_level,             // e.g. "LOW"
  issues_count:  security.total_findings,         // e.g. 3
  test_ratio:    quality.summary.test_coverage_ratio,
  functions:     quality.summary.total_functions,
  recorded_at:   new Date().toISOString(),
};

console.log(JSON.stringify(snapshot, null, 2));

// Example: POST to a webhook
// node track-quality.js | curl -s -X POST https://yourapi/snapshots \\
//   -H "Content-Type: application/json" -d @-`,
  },
  {
    label: "LLM",
    filename: "llm-fix.js",
    explanation: "Extract the critical and high severity findings from the JSON and send them to any LLM (OpenAI, Anthropic, Groq). The LLM gets exact file paths and line numbers so it can suggest targeted fixes, not generic advice.",
    snippet: `// llm-fix.js — get AI-generated fix suggestions
const report = require('./gitwise-security.json');

// Pull only the most important findings
const urgent = report.findings
  .filter(f => ['critical', 'high'].includes(f.severity))
  .map(f => [
    \`File: \${f.file_path} (line \${f.line_number})\`,
    \`Issue: \${f.description}\`,
    \`Code:  \${f.line_content}\`,
  ].join('\\n'))
  .join('\\n\\n');

// Prompt ready to send to any LLM API
const prompt = \`
You are a security engineer. Fix these issues in my codebase:

\${urgent}

For each issue, provide the corrected code snippet.
\`;

console.log(prompt); // pipe this to your LLM of choice`,
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
      style={{
        background: copied ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.07)",
        border: copied ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(255,255,255,0.1)",
        color: copied ? "#34d399" : "#94a3b8",
      }}
    >
      {copied ? (
        <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg> Copied!</>
      ) : (
        <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copy</>
      )}
    </button>
  );
}

function DevPanel({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState(0);
  const tab = DEV_TABS[activeTab];

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998]"
        style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />

      {/* Panel — outer div handles centering, inner handles animation */}
      <div
        className="fixed z-[9999] flex items-center justify-center"
        style={{ inset: 0, pointerEvents: "none" }}
      >
      <div
        className="flex flex-col"
        style={{
          pointerEvents: "all",
          width: "min(520px, 92vw)",
          maxHeight: "85vh",
          background: "linear-gradient(145deg, #0f172a 0%, #0c1428 100%)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "16px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(99,102,241,0.1)",
          animation: "panelSlideUp 0.25s cubic-bezier(0.16,1,0.3,1) both",
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-6 py-5 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center font-mono text-sm font-bold text-emerald-400"
                style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)" }}
              >
                {"{}"}
              </div>
              <h2 className="text-sm font-semibold text-white">Using JSON in your pipeline</h2>
            </div>
            <p className="text-xs text-slate-500 ml-9.5">
              Copy-paste ready snippets for common developer workflows
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors mt-0.5 shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 pt-4 pb-2 shrink-0">
          {DEV_TABS.map((t, i) => (
            <button
              key={t.label}
              onClick={() => setActiveTab(i)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: activeTab === i ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                color: activeTab === i ? "#a5b4fc" : "#64748b",
                border: activeTab === i ? "1px solid rgba(99,102,241,0.35)" : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
          {/* Code block */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            {/* Code header */}
            <div
              className="flex items-center justify-between px-4 py-2.5"
              style={{ background: "rgba(0,0,0,0.35)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(239,68,68,0.5)" }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(234,179,8,0.5)" }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(34,197,94,0.5)" }} />
                </div>
                <span className="text-xs text-slate-500 font-mono ml-1">{tab.filename}</span>
              </div>
              <CopyButton text={tab.snippet} />
            </div>
            {/* Code */}
            <pre
              className="text-xs leading-relaxed overflow-x-auto p-4 text-slate-300 font-mono"
              style={{ background: "rgba(0,0,0,0.2)" }}
            >
              {tab.snippet}
            </pre>
          </div>

          {/* Plain-English explanation */}
          <div
            className="rounded-xl p-4"
            style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.12)" }}
          >
            <p className="text-xs font-semibold text-indigo-300 mb-1.5">What this does</p>
            <p className="text-sm text-slate-400 leading-relaxed">{tab.explanation}</p>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}

function JsonOption({ onSelect, setOpen, setShowDevPanel }: { onSelect: (f: string) => void; setOpen: (v: boolean) => void; setShowDevPanel: (v: boolean) => void }) {
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <button
          onClick={() => { onSelect("json"); setOpen(false); }}
          className="w-full text-left px-4 py-3 transition-all"
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-mono text-xs font-bold text-emerald-400"
                style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)" }}
              >
                {"{}"}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-200">JSON (.json)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">For Developers · CI/CD · PR Review</p>
              </div>
            </div>
            {/* Open dev panel */}
            <button
              onClick={(e) => { e.stopPropagation(); setShowDevPanel(true); setOpen(false); }}
              className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 shrink-0 px-2 py-1 rounded-lg transition-colors"
              style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}
              title="See how to use in your pipeline"
            >
              How to use
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </div>
        </button>
    </div>
  );
}

// ---- Download dropdown ----

function DownloadMenu({ onSelect }: { onSelect: (format: string) => void }) {
  const [open, setOpen] = useState(false);
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Calculate position from button when opening
  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen((v) => !v);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="shrink-0">
      {/* Trigger button */}
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu — fixed so it escapes overflow:hidden parents */}
      {open && (
        <div
          ref={menuRef}
          className="w-64 rounded-xl overflow-hidden z-[9999]"
          style={{
            position: "fixed",
            top: menuPos.top,
            right: menuPos.right,
            background: "linear-gradient(145deg, #0f172a 0%, #0c1428 100%)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.08)",
            animation: "slideDown 0.15s ease-out both",
          }}
        >
          <div
            className="px-4 py-2.5 flex items-center gap-2"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <p className="text-xs font-semibold text-slate-200">Download Report</p>
          </div>

          {/* md */}
          <button
            onClick={() => { onSelect("md"); setOpen(false); }}
            className="w-full text-left px-4 py-3 transition-all group"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)" }}>
                <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-200">Markdown (.md)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Best for GitHub, Notion, VS Code</p>
              </div>
            </div>
          </button>

          {/* txt */}
          <button
            onClick={() => { onSelect("txt"); setOpen(false); }}
            className="w-full text-left px-4 py-3 transition-all"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "rgba(71,85,105,0.2)", border: "1px solid rgba(71,85,105,0.3)" }}>
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-200">Plain Text (.txt)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Opens anywhere · Share via email</p>
              </div>
            </div>
          </button>

          {/* json — with developer note */}
          <JsonOption onSelect={onSelect} setOpen={setOpen} setShowDevPanel={setShowDevPanel} />

          {/* divider before pdf */}
          <div className="mx-4 my-1" style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />

          {/* pdf — coming soon */}
          <div className="px-4 py-3 opacity-40 cursor-not-allowed">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-200">PDF (.pdf)</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Polished · Client reports</p>
                </div>
              </div>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full text-slate-500 shrink-0"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                soon
              </span>
            </div>
          </div>
        </div>
      )}

      {/* DevPanel portal — lives here so it survives dropdown close */}
      {showDevPanel && createPortal(
        <DevPanel onClose={() => setShowDevPanel(false)} />,
        document.body
      )}
    </div>
  );
}

// ---- Sub-components ----

function SeverityBadge({ level }: { level: string }) {
  const cls =
    level === "critical"
      ? "badge-critical"
      : level === "high"
      ? "badge-high"
      : level === "medium"
      ? "badge-medium"
      : level === "low"
      ? "badge-low"
      : "badge-info";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {level.toUpperCase()}
    </span>
  );
}

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    CRITICAL: "text-red-400 border-red-500/30",
    HIGH: "text-orange-400 border-orange-500/30",
    MEDIUM: "text-yellow-400 border-yellow-500/30",
    LOW: "text-blue-400 border-blue-500/30",
    CLEAN: "text-emerald-400 border-emerald-500/30",
  };
  const bg: Record<string, string> = {
    CRITICAL: "rgba(220,38,38,0.1)",
    HIGH: "rgba(234,88,12,0.1)",
    MEDIUM: "rgba(202,138,4,0.1)",
    LOW: "rgba(37,99,235,0.1)",
    CLEAN: "rgba(16,185,129,0.1)",
  };
  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-bold border ${colors[level] || colors.CLEAN}`}
      style={{ background: bg[level] || bg.CLEAN }}
    >
      {level}
    </span>
  );
}

function GradeCircle({ grade, score }: { grade: string; score: number }) {
  const colors: Record<string, { text: string; border: string; glow: string }> = {
    A: { text: "text-emerald-400", border: "rgba(16,185,129,0.5)", glow: "rgba(16,185,129,0.15)" },
    B: { text: "text-blue-400", border: "rgba(59,130,246,0.5)", glow: "rgba(59,130,246,0.15)" },
    C: { text: "text-yellow-400", border: "rgba(202,138,4,0.5)", glow: "rgba(202,138,4,0.15)" },
    D: { text: "text-orange-400", border: "rgba(234,88,12,0.5)", glow: "rgba(234,88,12,0.15)" },
    F: { text: "text-red-400", border: "rgba(220,38,38,0.5)", glow: "rgba(220,38,38,0.15)" },
  };
  const c = colors[grade] || colors.F;
  return (
    <div
      className={`w-16 h-16 rounded-full flex flex-col items-center justify-center shrink-0 ${c.text}`}
      style={{
        border: `3px solid ${c.border}`,
        background: c.glow,
        boxShadow: `0 0 20px ${c.glow}`,
      }}
    >
      <span className="text-2xl font-bold leading-none">{grade}</span>
      <span className="text-[10px] opacity-60 mt-0.5">{score}/100</span>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl p-3 text-center"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

// ---- Architecture Tab ----
function ArchitectureTab({ data }: { data: Record<string, any> }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Files", value: (data.stats as Record<string, unknown>)?.total_files },
          { label: "Lines", value: Number((data.stats as Record<string, unknown>)?.total_lines).toLocaleString() },
          { label: "Size", value: `${(data.stats as Record<string, unknown>)?.total_size_kb} KB` },
          { label: "Frameworks", value: (data.frameworks as string[])?.length || 0 },
        ].map(({ label, value }) => (
          <StatCard key={label} label={label} value={String(value ?? "—")} />
        ))}
      </div>

      {data.languages && (
        <div>
          <h3 className="text-xs text-slate-500 font-medium uppercase tracking-widest mb-3">Languages</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.languages as Record<string, number>)
              .slice(0, 10)
              .map(([lang, lines]) => (
                <span
                  key={lang}
                  className="px-2.5 py-1 rounded-full text-blue-300 text-xs"
                  style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}
                >
                  {lang} · {lines.toLocaleString()} lines
                </span>
              ))}
          </div>
        </div>
      )}

      {(data.frameworks as string[])?.length > 0 && (
        <div>
          <h3 className="text-xs text-slate-500 font-medium uppercase tracking-widest mb-3">Frameworks & Libraries</h3>
          <div className="flex flex-wrap gap-2">
            {(data.frameworks as string[]).map((f) => (
              <span
                key={f}
                className="px-2.5 py-1 rounded-full text-purple-300 text-xs"
                style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {(data.patterns as string[])?.length > 0 && (
        <div>
          <h3 className="text-xs text-slate-500 font-medium uppercase tracking-widest mb-3">Detected Patterns</h3>
          <ul className="space-y-1.5">
            {(data.patterns as string[]).map((p) => (
              <li key={p} className="text-sm text-slate-300 flex items-center gap-2">
                <span className="text-emerald-400 text-xs">✓</span> {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.folder_tree && (
        <div>
          <h3 className="text-xs text-slate-500 font-medium uppercase tracking-widest mb-3">Folder Structure</h3>
          <pre
            className="rounded-xl p-4 text-xs text-slate-400 overflow-x-auto max-h-48"
            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {String(data.folder_tree)}
          </pre>
        </div>
      )}

      {data.ai_analysis && (
        <div>
          <h3 className="text-xs text-slate-500 font-medium uppercase tracking-widest mb-3">AI Analysis</h3>
          <div
            className="rounded-xl p-5 prose-dark"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{String(data.ai_analysis)}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Security Tab ----
function SecurityTab({ data }: { data: Record<string, any> }) {
  const counts = data.severity_counts as Record<string, number>;
  const findings = data.findings as Array<Record<string, unknown>>;
  const riskLevel = data.risk_level as string;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <RiskBadge level={riskLevel} />
        <div className="flex gap-4 text-sm">
          <span className="text-red-400">{counts?.critical || 0} Critical</span>
          <span className="text-orange-400">{counts?.high || 0} High</span>
          <span className="text-yellow-400">{counts?.medium || 0} Medium</span>
          <span className="text-blue-400">{counts?.low || 0} Low</span>
        </div>
        <span className="ml-auto text-slate-500 text-sm">
          Risk Score: <strong className="text-slate-300">{String(data.risk_score)}/100</strong>
        </span>
      </div>

      {findings?.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-xs text-slate-500 font-medium uppercase tracking-widest mb-3">
            Findings ({data.total_findings as number})
          </h3>
          {findings.map((f, i) => (
            <div
              key={i}
              className="rounded-xl p-4 space-y-2 animate-slide-in"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <SeverityBadge level={f.severity as string} />
                  <span className="text-sm font-medium text-slate-200">{f.category as string}</span>
                </div>
                <span className="text-xs text-slate-600 shrink-0">
                  {f.file_path as string}:{f.line_number as number}
                </span>
              </div>
              <p className="text-xs text-slate-500">{f.description as string}</p>
              {Boolean(f.line_content) && (
                <code
                  className="block text-xs text-slate-400 rounded-lg px-3 py-2 overflow-x-auto"
                  style={{ background: "rgba(0,0,0,0.3)" }}
                >
                  {f.line_content as string}
                </code>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div
          className="text-emerald-400 rounded-xl p-5 text-center text-sm"
          style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)" }}
        >
          No security issues found — clean codebase ✓
        </div>
      )}

      {data.ai_analysis && (
        <div>
          <h3 className="text-xs text-slate-500 font-medium uppercase tracking-widest mb-3">AI Security Assessment</h3>
          <div
            className="rounded-xl p-5 prose-dark"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{String(data.ai_analysis)}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Quality Tab ----
function QualityTab({ data }: { data: Record<string, any> }) {
  const summary = data.summary as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-6 flex-wrap">
        <GradeCircle
          grade={summary?.quality_grade as string || "?"}
          score={summary?.quality_score as number || 0}
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1">
          {[
            { label: "Functions", value: summary?.total_functions },
            { label: "Classes", value: summary?.total_classes },
            { label: "TODOs", value: summary?.total_todos },
            { label: "Test Files", value: summary?.test_files },
            { label: "Test Ratio", value: `${((summary?.test_coverage_ratio as number || 0) * 100).toFixed(0)}%` },
            { label: "Comment Ratio", value: `${((summary?.avg_comment_ratio as number || 0) * 100).toFixed(0)}%` },
          ].map(({ label, value }) => (
            <StatCard key={label} label={label} value={String(value ?? "—")} />
          ))}
        </div>
      </div>

      {data.complexity_distribution && (
        <div>
          <h3 className="text-xs text-slate-500 font-medium uppercase tracking-widest mb-3">Complexity Distribution</h3>
          <div className="flex gap-3 flex-wrap">
            {Object.entries(data.complexity_distribution as Record<string, number>).map(
              ([level, count]) =>
                count > 0 ? (
                  <div
                    key={level}
                    className="rounded-xl px-3 py-2 text-center"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="text-sm font-bold text-slate-200">{count}</div>
                    <div className="text-xs text-slate-500">{level}</div>
                  </div>
                ) : null
            )}
          </div>
        </div>
      )}

      {(data.largest_files as Array<{ path: string; lines: number }>)?.length > 0 && (
        <div>
          <h3 className="text-xs text-slate-500 font-medium uppercase tracking-widest mb-3">Largest Files</h3>
          <div className="space-y-1.5">
            {(data.largest_files as Array<{ path: string; lines: number }>).map((f, i) => (
              <div
                key={i}
                className="flex justify-between text-sm rounded-lg px-3 py-2"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
              >
                <code className="text-slate-400 text-xs truncate max-w-xs">{f.path}</code>
                <span className="text-slate-600 shrink-0 text-xs">{f.lines.toLocaleString()} lines</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.ai_analysis && (
        <div>
          <h3 className="text-xs text-slate-500 font-medium uppercase tracking-widest mb-3">AI Quality Assessment</h3>
          <div
            className="rounded-xl p-5 prose-dark"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{String(data.ai_analysis)}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- README Tab ----
function ReadmeTab({ data }: { data: Record<string, any> }) {
  const [copied, setCopied] = useState(false);
  const content = String(data.content || "");

  const copy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">
          Generated README · {data.word_count as number} words
        </p>
        <button
          onClick={copy}
          className="text-xs px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {copied ? "✓ Copied!" : "Copy Markdown"}
        </button>
      </div>
      <div
        className="rounded-xl p-6 prose-dark max-h-[600px] overflow-y-auto"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
}

// ---- ZIP format picker ----

function ZipMenu({ reports, repoUrl }: { reports: Reports; repoUrl?: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({ md: true, json: true, txt: false });
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const name = repoName(repoUrl);
  const noneSelected = !Object.values(selected).some(Boolean);

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleDownload = async () => {
    const zip = new JSZip();
    const keys: TabKey[] = ["architecture", "security", "quality", "readme"];
    for (const key of keys) {
      const data = reports[key] as Record<string, any> | undefined;
      if (!data) continue;
      if (selected.md)   zip.file(`${key}.md`,   getMarkdown(key, data, repoUrl));
      if (selected.json) zip.file(`${key}.json`,  JSON.stringify(data, null, 2));
      if (selected.txt)  zip.file(`${key}.txt`,   getPlainText(key, data, repoUrl));
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gitwise-${name}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const formats = [
    { key: "md",   label: "Markdown",   ext: ".md",   desc: "GitHub · Notion · VS Code" },
    { key: "json", label: "JSON",        ext: ".json", desc: "CI/CD · PR Review · LLM" },
    { key: "txt",  label: "Plain Text",  ext: ".txt",  desc: "Email · Simple viewers" },
  ];

  return (
    <div className="shrink-0">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {name}.zip
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          className="w-60 rounded-xl overflow-hidden z-[9999]"
          style={{
            position: "fixed",
            top: menuPos.top,
            right: menuPos.right,
            background: "linear-gradient(145deg, #0f172a 0%, #0c1428 100%)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.08)",
            animation: "slideDown 0.15s ease-out both",
          }}
        >
          {/* Header */}
          <div className="px-4 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs font-semibold text-slate-200">Download All Reports</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Choose formats to include</p>
          </div>

          {/* Format checkboxes */}
          <div className="px-4 py-3 space-y-3">
            {formats.map(({ key, label, ext, desc }) => (
              <label
                key={key}
                className="flex items-center gap-3 cursor-pointer group"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all"
                  style={{
                    background: selected[key] ? "rgba(99,102,241,0.8)" : "rgba(255,255,255,0.06)",
                    border: selected[key] ? "1px solid rgba(99,102,241,1)" : "1px solid rgba(255,255,255,0.15)",
                  }}
                  onClick={() => setSelected((s) => ({ ...s, [key]: !s[key] }))}
                >
                  {selected[key] && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div
                  className="flex-1"
                  onClick={() => setSelected((s) => ({ ...s, [key]: !s[key] }))}
                >
                  <span className="text-xs text-slate-200 font-medium">{label} </span>
                  <span className="text-xs text-slate-500">{ext}</span>
                  <p className="text-[11px] text-slate-600 mt-0.5">{desc}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Download button */}
          <div className="px-4 pb-4">
            <button
              onClick={handleDownload}
              disabled={noneSelected}
              className="w-full py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: noneSelected ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #4f46e5, #2563eb)",
                color: noneSelected ? "#475569" : "#fff",
                cursor: noneSelected ? "not-allowed" : "pointer",
                boxShadow: noneSelected ? "none" : "0 4px 16px rgba(79,70,229,0.35)",
              }}
            >
              {noneSelected ? "Select at least one format" : `Download ${name}.zip`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Main ----
export default function ReportTabs({ reports, repoUrl }: Props) {
  const availableTabs = TABS.filter((t) => reports[t.key]);
  const [activeTab, setActiveTab] = useState<TabKey>(availableTabs[0]?.key || "architecture");
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showDevPanelFromBanner, setShowDevPanelFromBanner] = useState(false);

  if (availableTabs.length === 0) return null;

  const currentData = reports[activeTab] as Record<string, any>;

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Tab bar */}
      <div
        className="flex items-center overflow-x-auto"
        style={{
          background: "rgba(255,255,255,0.02)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex flex-1 overflow-x-auto">
          {availableTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 ${
                activeTab === tab.key
                  ? "text-white border-blue-500"
                  : "text-slate-500 border-transparent hover:text-slate-300"
              }`}
              style={activeTab === tab.key ? { background: "rgba(59,130,246,0.06)" } : {}}
            >
              <span
                className={`transition-colors ${
                  activeTab === tab.key ? "text-blue-400" : "text-slate-600"
                }`}
              >
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Download controls */}
        <div className="flex items-center gap-2 px-3 shrink-0">
          {/* Per-tab format dropdown */}
          <DownloadMenu onSelect={(format) => {
            const data = reports[activeTab] as Record<string, any>;
            if (format === "md") {
              triggerDownload(`gitwise-${activeTab}.md`, getMarkdown(activeTab, data, repoUrl), "text/markdown");
            } else if (format === "txt") {
              triggerDownload(`gitwise-${activeTab}.txt`, getPlainText(activeTab, data, repoUrl), "text/plain");
            } else if (format === "json") {
              triggerDownload(`gitwise-${activeTab}.json`, JSON.stringify(data, null, 2), "application/json");
            }
          }} />
          {/* Download all as ZIP — with format picker */}
          <ZipMenu reports={reports} repoUrl={repoUrl} />
        </div>
      </div>

      {/* Developer banner */}
      {!bannerDismissed && (
        <div
          className="flex items-center gap-3 px-5 py-2.5"
          style={{
            background: "rgba(16,185,129,0.06)",
            borderBottom: "1px solid rgba(16,185,129,0.12)",
          }}
        >
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 font-mono text-xs font-bold text-emerald-400"
            style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)" }}
          >
            {"{}"}
          </div>
          <p className="text-xs text-slate-400 flex-1">
            <span className="text-emerald-400 font-medium">Developer? </span>
            Export reports as JSON. Plug directly into CI/CD pipelines, PR reviews or LLM workflows.
          </p>
          <button
            onClick={() => setShowDevPanelFromBanner(true)}
            className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
          >
            See how
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => setBannerDismissed(true)}
            className="text-slate-600 hover:text-slate-400 transition-colors shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Tab content */}
      <div className="p-6">
        {activeTab === "architecture" && <ArchitectureTab data={currentData} />}
        {activeTab === "security" && <SecurityTab data={currentData} />}
        {activeTab === "quality" && <QualityTab data={currentData} />}
        {activeTab === "readme" && <ReadmeTab data={currentData} />}
      </div>

      {/* DevPanel triggered from banner */}
      {showDevPanelFromBanner && createPortal(
        <DevPanel onClose={() => setShowDevPanelFromBanner(false)} />,
        document.body
      )}
    </div>
  );
}
