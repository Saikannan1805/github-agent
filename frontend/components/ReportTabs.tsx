"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Reports } from "@/app/page";

interface Props {
  reports: Reports;
}

type TabKey = "architecture" | "security" | "quality" | "readme";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "architecture", label: "Architecture", icon: "🏗️" },
  { key: "security", label: "Security", icon: "🔒" },
  { key: "quality", label: "Code Quality", icon: "📊" },
  { key: "readme", label: "Auto README", icon: "📝" },
];

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
    CRITICAL: "text-red-400 bg-red-950/60 border-red-500/40",
    HIGH: "text-orange-400 bg-orange-950/60 border-orange-500/40",
    MEDIUM: "text-yellow-400 bg-yellow-950/60 border-yellow-500/40",
    LOW: "text-blue-400 bg-blue-950/60 border-blue-500/40",
    CLEAN: "text-emerald-400 bg-emerald-950/60 border-emerald-500/40",
  };
  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-bold border ${colors[level] || colors.CLEAN}`}
    >
      {level}
    </span>
  );
}

function GradeCircle({ grade, score }: { grade: string; score: number }) {
  const colors: Record<string, string> = {
    A: "text-emerald-400 border-emerald-500",
    B: "text-sky-400 border-sky-500",
    C: "text-yellow-400 border-yellow-500",
    D: "text-orange-400 border-orange-500",
    F: "text-red-400 border-red-500",
  };
  return (
    <div
      className={`w-16 h-16 rounded-full border-4 flex flex-col items-center justify-center ${colors[grade] || colors.F}`}
    >
      <span className="text-2xl font-bold">{grade}</span>
      <span className="text-[10px] opacity-70">{score}/100</span>
    </div>
  );
}

// ---- Architecture Tab ----
function ArchitectureTab({ data }: { data: Record<string, any> }) {
  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Files", value: (data.stats as Record<string, unknown>)?.total_files },
          { label: "Lines", value: Number((data.stats as Record<string, unknown>)?.total_lines).toLocaleString() },
          { label: "Size", value: `${(data.stats as Record<string, unknown>)?.total_size_kb} KB` },
          { label: "Frameworks", value: (data.frameworks as string[])?.length || 0 },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-800 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-slate-100">{String(value ?? "—")}</div>
            <div className="text-xs text-slate-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Languages */}
      {data.languages && (
        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-2">Languages</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.languages as Record<string, number>)
              .slice(0, 10)
              .map(([lang, lines]) => (
                <span key={lang} className="px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs">
                  {lang} · {lines.toLocaleString()} lines
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Frameworks */}
      {(data.frameworks as string[])?.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-2">Frameworks & Libraries</h3>
          <div className="flex flex-wrap gap-2">
            {(data.frameworks as string[]).map((f) => (
              <span key={f} className="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Patterns */}
      {(data.patterns as string[])?.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-2">Detected Patterns</h3>
          <ul className="space-y-1">
            {(data.patterns as string[]).map((p) => (
              <li key={p} className="text-sm text-slate-300 flex items-center gap-2">
                <span className="text-emerald-400">✓</span> {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Folder tree */}
      {data.folder_tree && (
        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-2">Folder Structure</h3>
          <pre className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-xs text-slate-300 overflow-x-auto max-h-48">
            {String(data.folder_tree)}
          </pre>
        </div>
      )}

      {/* AI Analysis */}
      {data.ai_analysis && (
        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-3">AI Analysis</h3>
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 prose-dark">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {String(data.ai_analysis)}
            </ReactMarkdown>
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
      {/* Risk overview */}
      <div className="flex items-center gap-4">
        <RiskBadge level={riskLevel} />
        <div className="flex gap-4 text-sm">
          <span className="text-red-400">{counts?.critical || 0} Critical</span>
          <span className="text-orange-400">{counts?.high || 0} High</span>
          <span className="text-yellow-400">{counts?.medium || 0} Medium</span>
          <span className="text-blue-400">{counts?.low || 0} Low</span>
        </div>
        <span className="ml-auto text-slate-400 text-sm">
          Risk Score: <strong className="text-slate-200">{String(data.risk_score)}/100</strong>
        </span>
      </div>

      {/* Findings */}
      {findings?.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-400 mb-2">
            Findings ({data.total_findings as number})
          </h3>
          {findings.map((f, i) => (
            <div
              key={i}
              className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-2 animate-slide-in"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <SeverityBadge level={f.severity as string} />
                  <span className="text-sm font-medium text-slate-200">
                    {f.category as string}
                  </span>
                </div>
                <span className="text-xs text-slate-500 shrink-0">
                  {f.file_path as string}:{f.line_number as number}
                </span>
              </div>
              <p className="text-xs text-slate-400">{f.description as string}</p>
              {Boolean(f.line_content) && (
                <code className="block text-xs text-slate-300 bg-slate-900 rounded px-3 py-2 overflow-x-auto">
                  {f.line_content as string}
                </code>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-emerald-400 bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-5 text-center">
          No security issues found! 🎉
        </div>
      )}

      {/* AI Analysis */}
      {data.ai_analysis && (
        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-3">AI Security Assessment</h3>
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 prose-dark">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {String(data.ai_analysis)}
            </ReactMarkdown>
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
      {/* Grade + metrics */}
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
            <div key={label} className="bg-slate-800 rounded-lg p-3">
              <div className="text-lg font-bold text-slate-100">{String(value ?? "—")}</div>
              <div className="text-xs text-slate-400">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Complexity */}
      {data.complexity_distribution && (
        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-2">Complexity Distribution</h3>
          <div className="flex gap-3 flex-wrap">
            {Object.entries(data.complexity_distribution as Record<string, number>).map(
              ([level, count]) =>
                count > 0 ? (
                  <div key={level} className="bg-slate-800 rounded-lg px-3 py-2 text-center">
                    <div className="text-sm font-bold text-slate-200">{count}</div>
                    <div className="text-xs text-slate-400">{level}</div>
                  </div>
                ) : null
            )}
          </div>
        </div>
      )}

      {/* Largest files */}
      {(data.largest_files as Array<{ path: string; lines: number }>)?.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-2">Largest Files</h3>
          <div className="space-y-1.5">
            {(data.largest_files as Array<{ path: string; lines: number }>).map((f, i) => (
              <div key={i} className="flex justify-between text-sm bg-slate-800 rounded-lg px-3 py-2">
                <code className="text-slate-300 text-xs truncate max-w-xs">{f.path}</code>
                <span className="text-slate-400 shrink-0">{f.lines.toLocaleString()} lines</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Analysis */}
      {data.ai_analysis && (
        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-3">AI Quality Assessment</h3>
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 prose-dark">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {String(data.ai_analysis)}
            </ReactMarkdown>
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
        <p className="text-sm text-slate-400">
          Generated README · {data.word_count as number} words
        </p>
        <button
          onClick={copy}
          className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition"
        >
          {copied ? "✓ Copied!" : "Copy Markdown"}
        </button>
      </div>
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 prose-dark max-h-[600px] overflow-y-auto">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
}

// ---- Main ----
export default function ReportTabs({ reports }: Props) {
  const availableTabs = TABS.filter((t) => reports[t.key]);
  const [activeTab, setActiveTab] = useState<TabKey>(availableTabs[0]?.key || "architecture");

  if (availableTabs.length === 0) return null;

  const currentData = reports[activeTab] as Record<string, any>;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-slate-700 bg-slate-800/50">
        {availableTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === tab.key
                ? "border-sky-500 text-sky-400 bg-slate-900/60"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
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
