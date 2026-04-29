"use client";

import React, { useState, useEffect, useRef } from "react";

const CYCLE_DURATION = 4000;

const USE_CASES = [
  {
    id: "cicd",
    title: "Block bad code automatically",
    subtitle: "CI/CD Gates",
    tagline: "Block risky merges before they reach main",
    difficulty: "Intermediate",
    difficultyColor: { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)", text: "#fbbf24" },
    jsonNeeded: ["Security JSON", "Quality JSON"],
    plainExplanation:
      "Runs on every PR via GitHub Actions. Downloads the Gitwise security report, reads the risk_level field and exits non-zero if it's CRITICAL. This fails the check and blocks the merge automatically.",
    whatItDoes: [
      "Triggers on pull_request events in GitHub Actions",
      "Parses risk_level and quality.score from the JSON",
      "Exits 1 on CRITICAL risk. CI fails, merge is blocked",
    ],
    filename: ".github/workflows/gitwise.yml",
    walkthrough: [
      { step: "1", action: "Analyze your repo", detail: "Paste your GitHub repo URL into Gitwise and wait for analysis to complete." },
      { step: "2", action: "Download Security JSON", detail: 'Click the Download button on the Security tab → select "JSON". Save it somewhere handy.' },
      { step: "3", action: "Go to your GitHub repo", detail: "Open your repository on github.com in your browser." },
      { step: "4", action: "Open the Actions tab", detail: 'Click the "Actions" tab at the top of your repo page.' },
      { step: "5", action: "Create a new workflow", detail: 'Click "New workflow" → then "set up a workflow yourself" at the top right.' },
      { step: "6", action: "Name the file", detail: 'GitHub will pre-fill the path as `.github/workflows/main.yml`. Rename it to `gitwise.yml`.' },
      { step: "7", action: "Paste the code", detail: "Clear the editor, then paste the code from the middle panel exactly as-is." },
      { step: "8", action: "Commit the file", detail: 'Click "Commit changes" and confirm. It now runs automatically on every Pull Request.' },
    ],
    snippet: `name: Gitwise Code Review
on: [pull_request]

jobs:
  gitwise:
    runs-on: ubuntu-latest
    steps:
      - name: Analyze repo with Gitwise
        run: |
          curl -X POST https://gitwise.dev/api/analyze \\
            -H "Content-Type: application/json" \\
            -d '{"repo_url": "https://github.com/\${{ github.repository }}"}' \\
            -o report.json

      - name: Block merge if security risk is critical
        run: |
          RISK=$(cat report.json | jq -r '.security.risk_level')
          SCORE=$(cat report.json | jq -r '.quality.score')
          echo "Security Risk: $RISK"
          echo "Quality Score: $SCORE"
          if [ "$RISK" = "CRITICAL" ]; then
            echo "Critical security issues found. Merge blocked."
            exit 1
          fi`,
  },
  {
    id: "pr",
    title: "Auto-post a summary on your PR",
    subtitle: "PR Review",
    tagline: "Post analysis summaries directly onto every PR",
    difficulty: "Intermediate",
    difficultyColor: { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)", text: "#fbbf24" },
    jsonNeeded: ["All 4 reports"],
    plainExplanation:
      "Uses the Octokit SDK to post a formatted Markdown table directly onto the PR thread. Reviewers see risk level, quality grade and finding count inline. No extra tools, no context switching.",
    whatItDoes: [
      "Reads security and quality fields from the Gitwise JSON",
      "Builds a Markdown table with risk badge, grade, and issue count",
      "Posts it as a PR comment via the GitHub REST API",
    ],
    filename: "scripts/post-review.js",
    walkthrough: [
      { step: "1", action: "Analyze your repo", detail: "Paste your GitHub repo URL into Gitwise and wait for analysis to complete." },
      { step: "2", action: "Download the JSON", detail: 'Click Download on any report tab → select "JSON". Save it as `gitwise-report.json` in your project root.' },
      { step: "3", action: "Open your terminal", detail: "Navigate to your project folder in the terminal." },
      { step: "4", action: "Install the dependency", detail: "Run: `npm install @octokit/rest`. This is the official GitHub API library." },
      { step: "5", action: "Create the script file", detail: "Create a new file at `scripts/post-review.js` and paste the code from the middle panel." },
      { step: "6", action: "Set your env vars", detail: "Export these before running: `GITHUB_TOKEN` (from GitHub Settings → Developer → Personal Access Tokens), `REPO_OWNER`, `REPO_NAME`, `PR_NUMBER`." },
      { step: "7", action: "Run the script", detail: "Run: `node scripts/post-review.js`. It posts a comment to your PR automatically." },
      { step: "8", action: "Check your PR", detail: "Open the PR on GitHub. You'll see the Gitwise summary posted as a comment." },
    ],
    snippet: `// Run: node scripts/post-review.js
// Requires: npm install @octokit/rest

const fs = require("fs");
const { Octokit } = require("@octokit/rest");

const report = JSON.parse(fs.readFileSync("gitwise-report.json"));
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const badge = (level) =>
  ({ CRITICAL: "🔴", HIGH: "🟠", MEDIUM: "🟡", LOW: "🟢" }[level] ?? "⚪");

const body = \`## Gitwise Analysis Report

| Metric         | Result |
|----------------|--------|
| Risk Level     | \${badge(report.security.risk_level)} \${report.security.risk_level} |
| Quality Grade  | **\${report.quality.grade}** (\${report.quality.score}/100) |
| Issues Found   | \${report.security.findings.length} issues |

> Auto-generated by [Gitwise](https://gitwise.dev)\`;

await octokit.issues.createComment({
  owner: process.env.REPO_OWNER,
  repo: process.env.REPO_NAME,
  issue_number: parseInt(process.env.PR_NUMBER),
  body,
});`,
  },
  {
    id: "llm",
    title: "Ask AI to explain and fix issues",
    subtitle: "LLM Auto-fix",
    tagline: "Turn security findings into code fixes in seconds",
    difficulty: "Beginner",
    difficultyColor: { bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)", text: "#34d399" },
    jsonNeeded: ["Security JSON"],
    plainExplanation:
      "Pipes the security findings array from the JSON directly into a Claude prompt. The model returns file-level fix suggestions with code examples. Turns a static report into an actionable diff in seconds.",
    whatItDoes: [
      "Extracts security.findings[] from the Gitwise JSON",
      "Constructs a structured prompt and sends it to Claude via the Anthropic SDK",
      "Prints fix suggestions with code examples to stdout",
    ],
    filename: "scripts/autofix.py",
    walkthrough: [
      { step: "1", action: "Analyze your repo", detail: "Paste your GitHub repo URL into Gitwise and wait for analysis to complete." },
      { step: "2", action: "Download Security JSON", detail: 'Click Download on the Security tab → select "JSON". Save it as `gitwise-report.json` in your project folder.' },
      { step: "3", action: "Install the dependency", detail: "Open your terminal and run: `pip install anthropic`" },
      { step: "4", action: "Get your API key", detail: "Go to console.anthropic.com → API Keys → Create Key. Copy it." },
      { step: "5", action: "Set the env var", detail: "In your terminal run: `export ANTHROPIC_API_KEY=your_key_here`" },
      { step: "6", action: "Create the script", detail: "Create `scripts/autofix.py` in your project and paste the code from the middle panel." },
      { step: "7", action: "Run it", detail: "Run: `python scripts/autofix.py`. Claude's fix suggestions will print directly in your terminal." },
    ],
    snippet: `# Run: python scripts/autofix.py
# Requires: pip install anthropic

import json
import anthropic

with open("gitwise-report.json") as f:
    report = json.load(f)

findings = report["security"]["findings"]

if not findings:
    print("No security issues found. You're good!")
    exit(0)

client = anthropic.Anthropic()  # uses ANTHROPIC_API_KEY env var

message = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=2048,
    messages=[
        {
            "role": "user",
            "content": f"""You are a senior developer helping a beginner.
Below are security issues found in a codebase by an AI tool.
For each issue, explain in simple terms what it is and give
a specific code example of how to fix it.

Issues:
{json.dumps(findings, indent=2)}
"""
        }
    ],
)

print(message.content[0].text)`,
  },
  {
    id: "tracking",
    title: "Track code quality over time",
    subtitle: "Quality Tracking",
    tagline: "Plot quality trends and catch regressions early",
    difficulty: "Intermediate",
    difficultyColor: { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)", text: "#fbbf24" },
    jsonNeeded: ["Quality JSON"],
    plainExplanation:
      "On every merge to main, inserts a quality snapshot into Supabase: score, grade, risk level and commit SHA. Query the table over time to plot trends, catch regressions and prove quality is improving.",
    whatItDoes: [
      "Reads quality.score, quality.grade, and security.risk_level from the JSON",
      "Inserts a timestamped row into a Supabase quality_snapshots table",
      "Queryable over time. Plug into Grafana, Retool or a simple chart",
    ],
    filename: "scripts/track-quality.js",
    walkthrough: [
      { step: "1", action: "Analyze your repo", detail: "Paste your GitHub repo URL into Gitwise and wait for analysis to complete." },
      { step: "2", action: "Download Quality JSON", detail: 'Click Download on the Code Quality tab → select "JSON". Save it as `gitwise-report.json`.' },
      { step: "3", action: "Create a Supabase project", detail: "Go to supabase.com → New Project. Free tier is enough. No credit card needed." },
      { step: "4", action: "Create the table", detail: 'In Supabase, go to Table Editor → New Table. Name it `quality_snapshots`. Add columns: `repo`, `quality_score`, `quality_grade`, `risk_level`, `issues_count`, `recorded_at`.' },
      { step: "5", action: "Get your credentials", detail: "In Supabase go to Settings → API. Copy your Project URL and anon public key." },
      { step: "6", action: "Install the dependency", detail: "In your terminal run: `npm install @supabase/supabase-js`" },
      { step: "7", action: "Set your env vars", detail: "Export: `SUPABASE_URL=your_url` and `SUPABASE_KEY=your_anon_key`" },
      { step: "8", action: "Run the script", detail: "Create `scripts/track-quality.js`, paste the code, then run: `node scripts/track-quality.js`. Snapshot saved." },
    ],
    snippet: `// Run: node scripts/track-quality.js
// Requires: npm install @supabase/supabase-js

const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const report = JSON.parse(fs.readFileSync("gitwise-report.json"));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const snapshot = {
  repo:          report.repo,
  quality_score: report.quality.score,
  quality_grade: report.quality.grade,
  risk_level:    report.security.risk_level,
  issues_count:  report.security.findings.length,
  recorded_at:   new Date().toISOString(),
};

const { error } = await supabase
  .from("quality_snapshots")
  .insert(snapshot);

if (error) throw error;
console.log("Snapshot saved:", snapshot);`,
  },
];

const USE_CASE_ICONS: Record<string, React.ReactNode> = {
  cicd: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  pr: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  ),
  llm: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  tracking: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
};

const USE_CASE_ICON_COLORS: Record<string, { bg: string; border: string; color: string }> = {
  cicd:     { bg: "rgba(99,102,241,0.12)",  border: "1px solid rgba(99,102,241,0.28)",  color: "#a5b4fc" },
  pr:       { bg: "rgba(59,130,246,0.12)",  border: "1px solid rgba(59,130,246,0.28)",  color: "#93c5fd" },
  llm:      { bg: "rgba(245,158,11,0.12)",  border: "1px solid rgba(245,158,11,0.28)",  color: "#fcd34d" },
  tracking: { bg: "rgba(16,185,129,0.12)",  border: "1px solid rgba(16,185,129,0.28)",  color: "#6ee7b7" },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs font-medium transition-all duration-200 px-3 py-1.5 rounded-lg shrink-0"
      style={{
        color: copied ? "#34d399" : "#94a3b8",
        background: copied ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.05)",
        border: `1px solid ${copied ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.08)"}`,
      }}
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

export default function IntegrationRecipes({ visible = false }: { visible?: boolean }) {
  const [activeId, setActiveId] = useState(USE_CASES[0].id);
  const userClickedRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      if (userClickedRef.current) return;
      setActiveId((prev) => {
        const idx = USE_CASES.findIndex((c) => c.id === prev);
        return USE_CASES[(idx + 1) % USE_CASES.length].id;
      });
    }, CYCLE_DURATION);
    return () => clearTimeout(t);
  }, [visible, activeId]);

  const active = USE_CASES.find((c) => c.id === activeId)!;

  const stagger = (i: number) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0px)" : "translateY(24px)",
    transition: `opacity 0.55s ease ${i * 0.08}s, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 0.08}s`,
    willChange: "transform, opacity",
  });

  return (
    <section
      id="integrations"
      className="py-20 relative"
      style={{
        width: "100vw",
        left: "50%",
        transform: "translateX(-50%)",
        paddingLeft: "2rem",
        paddingRight: "2rem",
        contentVisibility: "auto",
        containIntrinsicSize: "0 1000px",
      } as React.CSSProperties}
    >
      {/* Ambient background */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ opacity: visible ? 1 : 0, transition: "opacity 1s ease" }}
      >
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, transparent 0%, rgba(2,8,20,0.6) 8%, rgba(2,8,20,0.6) 92%, transparent 100%)" }}
        />
        <div
          className="absolute"
          style={{ top: "5%", left: "2%", width: 560, height: 560, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)", filter: "blur(48px)", animation: "floatOrb1 16s ease-in-out infinite", willChange: "transform" }}
        />
        <div
          className="absolute"
          style={{ bottom: "8%", right: "3%", width: 640, height: 640, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)", filter: "blur(60px)", animation: "floatOrb2 20s ease-in-out infinite", willChange: "transform" }}
        />
      </div>


      <div className="max-w-7xl mx-auto">

        {/* Section header */}
        <div className="text-center mb-14" style={stagger(0)}>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
            style={{
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.18)",
              boxShadow: visible ? "0 0 24px rgba(16,185,129,0.12)" : "none",
              transition: "box-shadow 1s ease 0.4s",
            }}
          >
            <div className="w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold text-emerald-400" style={{ background: "rgba(16,185,129,0.15)" }}>
              {"{}"}
            </div>
            <span className="text-xs font-semibold text-emerald-400 tracking-wide uppercase">For Developers</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-3">
            Integrate in your pipeline
          </h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto leading-relaxed">
            Export the analysis as JSON and wire it into CI, PR workflows, LLM prompts or a database.
            Copy-paste ready. Swap your values and ship.
          </p>
        </div>

        {/* ── 4 Feature cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5" style={stagger(1)}>
          {USE_CASES.map((card, idx) => {
            const isActive = activeId === card.id;
            const ic = USE_CASE_ICON_COLORS[card.id];
            return (
              <button
                key={card.id}
                onClick={() => { userClickedRef.current = true; setActiveId(card.id); }}
                className="relative text-left rounded-2xl p-4 sm:p-5 overflow-hidden group"
                style={{
                  background: isActive ? ic.bg : "rgba(255,255,255,0.02)",
                  border: isActive ? ic.border : "1px solid rgba(255,255,255,0.06)",
                  transition: "background 0.35s ease, border-color 0.35s ease",
                }}
              >
                {/* Number badge */}
                <span
                  className="text-[10px] font-bold font-mono tracking-widest mb-3 block"
                  style={{
                    color: isActive ? ic.color : "rgba(71,85,105,0.45)",
                    transition: "color 0.35s ease",
                  }}
                >
                  0{idx + 1}
                </span>

                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
                  style={{
                    background: isActive ? ic.bg : "rgba(255,255,255,0.04)",
                    border: isActive ? ic.border : "1px solid rgba(255,255,255,0.07)",
                    color: isActive ? ic.color : "rgba(71,85,105,0.7)",
                    transition: "background 0.35s ease, border-color 0.35s ease, color 0.35s ease",
                  }}
                >
                  {USE_CASE_ICONS[card.id]}
                </div>

                {/* Title */}
                <p
                  className="text-sm font-semibold leading-snug mb-1.5"
                  style={{
                    color: isActive ? "#f1f5f9" : "rgba(100,116,139,0.7)",
                    transition: "color 0.35s ease",
                  }}
                >
                  {card.subtitle}
                </p>

                {/* Tagline */}
                <p
                  className="text-xs leading-relaxed"
                  style={{
                    color: isActive ? "rgba(203,213,225,0.55)" : "rgba(71,85,105,0.45)",
                    transition: "color 0.35s ease",
                  }}
                >
                  {card.tagline}
                </p>

                {/* Progress bar — only on active card, restarts on id change */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  {isActive && (
                    <div
                      key={activeId + (userClickedRef.current ? "-manual" : "-auto")}
                      style={{
                        height: "100%",
                        background: `linear-gradient(90deg, ${ic.color}60, ${ic.color})`,
                        animation: userClickedRef.current
                          ? "none"
                          : `fillProgress ${CYCLE_DURATION}ms linear forwards`,
                        width: userClickedRef.current ? "100%" : undefined,
                      }}
                    />
                  )}
                </div>

                {/* Hover shimmer on inactive */}
                {!isActive && (
                  <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 pointer-events-none"
                    style={{
                      background: "rgba(255,255,255,0.015)",
                      transition: "opacity 0.2s ease",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Expanded detail panel ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            ...stagger(2),
            border: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(5,10,24,0.75)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
          }}
        >
          {/* Panel header */}
          <div
            className="px-5 sm:px-6 py-4 flex items-center gap-3 flex-wrap"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: USE_CASE_ICON_COLORS[active.id].bg,
                border: USE_CASE_ICON_COLORS[active.id].border,
                color: USE_CASE_ICON_COLORS[active.id].color,
                transform: "scale(0.85)",
              }}
            >
              {USE_CASE_ICONS[active.id]}
            </div>
            <span className="text-sm font-semibold text-slate-200">{active.title}</span>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{
                background: active.difficultyColor.bg,
                border: `1px solid ${active.difficultyColor.border}`,
                color: active.difficultyColor.text,
              }}
            >
              {active.difficulty}
            </span>
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-slate-600">JSON needed:</span>
              {active.jsonNeeded.map((j) => (
                <span
                  key={j}
                  className="text-[11px] px-2 py-0.5 rounded-full text-blue-300 font-medium"
                  style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}
                >
                  {j}
                </span>
              ))}
            </div>
          </div>

          {/* Crossfade on switch */}
          <div key={active.id} className="flex flex-col lg:flex-row animate-fade-in">

            {/* Left — explanation + code */}
            <div
              className="flex-1 min-w-0 p-5 sm:p-6 flex flex-col gap-4"
              style={{ borderRight: "1px solid rgba(255,255,255,0.04)" }}
            >
              <p className="text-sm text-slate-400 leading-relaxed">{active.plainExplanation}</p>

              <ul className="flex flex-col gap-1.5">
                {active.whatItDoes.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-xs text-slate-500">
                    <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {point}
                  </li>
                ))}
              </ul>

              <div
                className="rounded-xl overflow-hidden"
                style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 12px 40px rgba(0,0,0,0.3)" }}
              >
                <div
                  className="flex items-center justify-between px-4 py-2.5"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-red-500/40" />
                      <span className="w-3 h-3 rounded-full bg-yellow-500/40" />
                      <span className="w-3 h-3 rounded-full bg-emerald-500/40" />
                    </div>
                    <span className="text-slate-500 text-xs font-mono">{active.filename}</span>
                  </div>
                  <CopyButton text={active.snippet} />
                </div>
                <pre className="overflow-x-auto p-5 font-mono text-xs leading-relaxed" style={{ color: "#cbd5e1" }}>
                  <code>{active.snippet}</code>
                </pre>
              </div>
            </div>

            {/* Right — walkthrough */}
            <div className="lg:w-72 xl:w-80 shrink-0 p-5 sm:p-6 flex flex-col gap-4">
              <p className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">How to set it up</p>
              <div className="flex flex-col gap-4">
                {active.walkthrough.map((w, i) => (
                  <div key={w.step} className="flex gap-3">
                    <div className="flex flex-col items-center shrink-0">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", color: "#34d399" }}
                      >
                        {w.step}
                      </div>
                      {i < active.walkthrough.length - 1 && (
                        <div className="w-px flex-1 mt-1.5" style={{ background: "rgba(16,185,129,0.12)", minHeight: "16px" }} />
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 pb-2">
                      <p className="text-xs font-semibold text-slate-300 leading-snug">{w.action}</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{w.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Bottom note */}
        <p className="text-center text-xs text-slate-600 mt-10 tracking-wide">
          Copy-paste ready &nbsp;·&nbsp; No vendor lock-in &nbsp;·&nbsp; MIT licensed
        </p>

      </div>
    </section>
  );
}
