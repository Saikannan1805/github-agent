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

const LINE_DELAY  = 700;
const LOOP_PAUSE  = 3500;
const LOG_VPAD    = 32;   // p-4 = 16px top + 16px bottom
const GAP_PX      = 6;    // space-y-1.5 = 0.375rem
const LH_RATIO    = 1.5;
// 13 lines + 1 cursor = 14 items, 13 gaps
// fontSize = (available − 13×6) / (14 × 1.5) = (available − 78) / 21
const TOTAL_ITEMS = DEMO_LINES.length + 1;
const TOTAL_GAPS  = TOTAL_ITEMS - 1;

export default function DemoTerminal() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [fontSize, setFontSize] = useState(13); // overridden by ResizeObserver
  const pausedRef    = useRef(false);
  const animTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const logRef       = useRef<HTMLDivElement>(null);

  // Measure the log div's actual rendered height and back-calculate the exact
  // font size so all TOTAL_ITEMS fit with zero leftover space.
  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    const calc = () => {
      const h = el.clientHeight;
      if (h === 0) return;
      const available = h - LOG_VPAD;
      const fs = (available - TOTAL_GAPS * GAP_PX) / (TOTAL_ITEMS * LH_RATIO);
      setFontSize(Math.max(8, fs));
    };
    calc();
    const obs = new ResizeObserver(calc);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    let scrollTimer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      pausedRef.current = true;
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => { pausedRef.current = false; }, 200);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(scrollTimer);
    };
  }, []);

  useEffect(() => {
    const clearAnim = () => clearTimeout(animTimerRef.current);
    if (visibleCount > DEMO_LINES.length) {
      animTimerRef.current = setTimeout(() => setVisibleCount(0), LOOP_PAUSE);
      return clearAnim;
    }
    const tick = () => {
      if (pausedRef.current) {
        animTimerRef.current = setTimeout(tick, 100);
        return;
      }
      setVisibleCount((v) => v + 1);
    };
    animTimerRef.current = setTimeout(tick, LINE_DELAY);
    return clearAnim;
  }, [visibleCount]);

  const isDone = visibleCount >= DEMO_LINES.length &&
    DEMO_LINES[visibleCount - 1]?.type === "done";

  const stepCount = DEMO_LINES.filter(l => l.type === "step" || l.type === "done").length;
  const completedSteps = DEMO_LINES
    .slice(0, visibleCount)
    .filter(l => l.type === "step" || l.type === "done").length;
  const progress = isDone ? 100 : Math.round((completedSteps / stepCount) * 100);

  return (
    <div
      className="glass rounded-2xl overflow-hidden flex-1 flex flex-col"
      style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.12), inset 0 1px 0 rgba(255,255,255,0.04)" }}
    >
      {/* Terminal header */}
      <div
        className="px-5 py-3 flex items-center gap-2.5 shrink-0"
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
      <div className="px-5 py-2.5 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
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

      {/* Log lines — font size is calculated to exactly fill this div */}
      <div
        ref={logRef}
        className="p-4 font-mono space-y-1.5 overflow-hidden flex-1 min-h-0"
        style={{ fontSize: `${fontSize}px`, lineHeight: LH_RATIO }}
      >
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
      </div>
    </div>
  );
}
