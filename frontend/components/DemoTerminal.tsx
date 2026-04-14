"use client";

import { useState, useEffect, useRef } from "react";

const DEMO_LINES = [
  { type: "cmd",  text: "gitwise analyze axios/axios" },
  { type: "step", text: "Cloning repository..." },
  { type: "log",  text: "Found 187 files · 24,391 lines of code" },
  { type: "step", text: "Chunking & Embedding..." },
  { type: "log",  text: "Processing 1,204 chunks into vectors" },
  { type: "step", text: "Analyzing Architecture..." },
  { type: "log",  text: "FastAPI · PostgreSQL · Docker · Redis" },
  { type: "step", text: "Security Scan..." },
  { type: "log",  text: "3 findings · Risk Score: LOW" },
  { type: "step", text: "Code Quality..." },
  { type: "log",  text: "Grade A · Score 89/100 · 42 functions" },
  { type: "step", text: "Generating README..." },
  { type: "done", text: "Analysis complete ✓" },
];

const LINE_DELAY = 700;
const LOOP_PAUSE = 3500;

export default function DemoTerminal() {
  const [visibleCount, setVisibleCount] = useState(0);
  const logEndRef = useRef<HTMLDivElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visibleCount > DEMO_LINES.length) {
      const t = setTimeout(() => setVisibleCount(0), LOOP_PAUSE);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setVisibleCount((v) => v + 1), LINE_DELAY);
    return () => clearTimeout(t);
  }, [visibleCount]);


  useEffect(() => {
    const container = logContainerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [visibleCount]);

  const isDone = visibleCount >= DEMO_LINES.length &&
    DEMO_LINES[visibleCount - 1]?.type === "done";

  const stepCount = DEMO_LINES.filter(l => l.type === "step" || l.type === "done").length;
  const completedSteps = DEMO_LINES
    .slice(0, visibleCount)
    .filter(l => l.type === "step" || l.type === "done").length;
  const progress = isDone ? 100 : Math.round((completedSteps / stepCount) * 100);

  return (
    <div className="glass rounded-2xl overflow-hidden h-full" style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.12), inset 0 1px 0 rgba(255,255,255,0.04)" }}>
      {/* Terminal header */}
      <div
        className="px-5 py-3 flex items-center gap-2.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
        </div>
        <span className="text-slate-500 text-xs font-mono">gitwise ~ live demo</span>
        <span className="ml-auto flex items-center gap-1.5 text-xs">
          {isDone ? (
            <span className="text-emerald-400 flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Complete
            </span>
          ) : (
            <span className="text-blue-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Analyzing
            </span>
          )}
        </span>
      </div>

      {/* Progress bar */}
      <div className="px-5 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-600">Progress</span>
          <span className="text-xs font-mono text-slate-500">{progress}%</span>
        </div>
        <div className="w-full h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progress}%`,
              background: isDone
                ? "linear-gradient(90deg, #10b981, #34d399)"
                : "linear-gradient(90deg, #3b82f6, #6366f1)",
            }}
          />
        </div>
      </div>

      {/* Log lines */}
      <div ref={logContainerRef} className="p-5 font-mono text-xs space-y-2 overflow-y-auto" style={{ height: "calc(100% - 90px)", minHeight: "200px" }}>
        {DEMO_LINES.slice(0, visibleCount).map((line, i) => (
          <div key={i} className="animate-slide-in">
            {line.type === "cmd" && (
              <span className="text-slate-300">
                <span className="text-indigo-400 mr-1.5">$</span>{line.text}
              </span>
            )}
            {line.type === "step" && (
              <span className="text-blue-300 font-semibold">▶ {line.text}</span>
            )}
            {line.type === "log" && (
              <span className="text-slate-500">&nbsp;&nbsp;&nbsp;{line.text}</span>
            )}
            {line.type === "done" && (
              <span className="text-emerald-400 font-semibold">✓ {line.text}</span>
            )}
          </div>
        ))}
        {!isDone && <span className="text-slate-600 blink">█</span>}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}
