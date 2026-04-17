"use client";

import { useState, useRef, useEffect } from "react";
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

async function downloadAll(reports: Reports, repoUrl?: string) {
  const zip = new JSZip();
  const name = repoName(repoUrl);
  const keys: TabKey[] = ["architecture", "security", "quality", "readme"];
  for (const key of keys) {
    const data = reports[key] as Record<string, any> | undefined;
    if (data) {
      zip.file(`${key}.md`,   getMarkdown(key, data, repoUrl));
      zip.file(`${key}.json`, JSON.stringify(data, null, 2));
    }
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gitwise-${name}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- JSON option with developer note ----

function JsonOption({ onSelect, setOpen }: { onSelect: (f: string) => void; setOpen: (v: boolean) => void }) {
  const [expanded, setExpanded] = useState(false);
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
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-mono text-xs font-bold text-emerald-400"
              style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)" }}>
              {"{}"}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-200">JSON (.json)</p>
              <p className="text-[11px] text-slate-500 mt-0.5">For Developers</p>
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {["CI/CD", "PR Review", "LLM Pipelines"].map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-1.5 py-0.5 rounded text-indigo-300 font-medium"
                    style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.2)" }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {/* Expand hint */}
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            className="text-[10px] text-indigo-400 hover:text-indigo-300 shrink-0 px-1.5 py-0.5 rounded transition-colors"
            style={{ background: "rgba(99,102,241,0.1)" }}
            title="How to use"
          >
            {expanded ? "▲ less" : "▼ how?"}
          </button>
        </div>
      </button>

      {/* Developer note — collapsible */}
      {expanded && (
        <div
          className="px-4 pb-3 text-[11px] text-slate-400 space-y-1.5"
          style={{ background: "rgba(99,102,241,0.04)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-indigo-300 font-medium mb-1">How to use in your pipeline:</p>
          <p>• <span className="text-slate-300">Block merges</span> — fail CI if <code className="text-indigo-300">risk_level === "CRITICAL"</code></p>
          <p>• <span className="text-slate-300">Track quality</span> — store <code className="text-indigo-300">quality_score</code> over time per repo</p>
          <p>• <span className="text-slate-300">Auto PR comments</span> — post findings via GitHub Actions</p>
          <p>• <span className="text-slate-300">Feed to LLM</span> — send findings to GPT/Claude for auto-fix suggestions</p>
        </div>
      )}
    </div>
  );
}

// ---- Download dropdown ----

function DownloadMenu({ onSelect }: { onSelect: (format: string) => void }) {
  const [open, setOpen] = useState(false);
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
          <JsonOption onSelect={onSelect} setOpen={setOpen} />

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

// ---- Main ----
export default function ReportTabs({ reports, repoUrl }: Props) {
  const availableTabs = TABS.filter((t) => reports[t.key]);
  const [activeTab, setActiveTab] = useState<TabKey>(availableTabs[0]?.key || "architecture");

  if (availableTabs.length === 0) return null;

  const currentData = reports[activeTab] as Record<string, any>;
  const zipName = repoName(repoUrl);

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
          {/* Download all as ZIP */}
          <button
            onClick={() => downloadAll(reports, repoUrl)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors shrink-0"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            title="Download all reports as ZIP (md + json)"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {zipName}.zip
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="p-6">
        {activeTab === "architecture" && <ArchitectureTab data={currentData} />}
        {activeTab === "security" && <SecurityTab data={currentData} />}
        {activeTab === "quality" && <QualityTab data={currentData} />}
        {activeTab === "readme" && <ReadmeTab data={currentData} />}
      </div>
    </div>
  );
}
