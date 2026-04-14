"use client";

import { useEffect, useRef } from "react";
import type { AnalysisEvent } from "@/app/page";

interface Props {
  events: AnalysisEvent[];
  phase: string;
}

const STEP_LABELS: Record<string, string> = {
  cloning: "Cloning Repository",
  embedding: "Chunking & Embedding",
  architecture: "Architecture Analysis",
  security: "Security Scan",
  quality: "Code Quality",
  readme: "README Generation",
};

const STEP_ORDER = ["cloning", "embedding", "architecture", "security", "quality", "readme"];

function StepIcon({ status }: { status: "pending" | "active" | "done" }) {
  if (status === "done") {
    return (
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: "rgba(16,185,129,0.15)",
          border: "1px solid rgba(16,185,129,0.4)",
        }}
      >
        <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (status === "active") {
    return (
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: "rgba(59,130,246,0.15)",
          border: "1px solid rgba(59,130,246,0.5)",
        }}
      >
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
      </span>
    );
  }
  return (
    <span
      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <span className="w-2 h-2 rounded-full bg-slate-600" />
    </span>
  );
}

export default function StreamingLog({ events, phase }: Props) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events]);

  // Compute step statuses and progress
  const completedSteps = new Set<string>();
  const stepProgress: Record<string, number> = {};
  let activeStep: string | null = null;

  for (const ev of events) {
    if (ev.type === "progress") {
      stepProgress[ev.data.step] = ev.data.percent;
      if (ev.data.percent === 100) completedSteps.add(ev.data.step);
    }
    if (ev.type === "step") {
      activeStep = ev.data.step;
    }
  }
  if (phase === "done") activeStep = null;

  // Overall progress: each step = 100/6 points
  const totalSteps = STEP_ORDER.length;
  const overallProgress =
    phase === "done"
      ? 100
      : Math.round(
          STEP_ORDER.reduce((acc, step) => acc + (stepProgress[step] ?? 0), 0) / totalSteps
        );

  const logs = events.filter((e) => e.type === "log" || e.type === "step");

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header bar */}
      <div
        className="px-5 py-3 flex items-center gap-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500/60" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
        </div>
        <span className="text-slate-500 text-sm font-mono">analysis.log</span>
        {phase === "analyzing" && (
          <span className="ml-auto text-xs text-blue-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Live
          </span>
        )}
        {phase === "done" && (
          <span className="ml-auto text-xs text-emerald-400 flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Complete
          </span>
        )}
      </div>

      {/* Overall progress bar */}
      <div className="px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500">Overall Progress</span>
          <span className="text-xs font-mono text-slate-400">{overallProgress}%</span>
        </div>
        <div
          className="w-full h-1 rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${overallProgress}%`,
              background:
                phase === "done"
                  ? "linear-gradient(90deg, #10b981, #34d399)"
                  : "linear-gradient(90deg, #3b82f6, #6366f1)",
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {/* Step tracker */}
        <div className="p-5 space-y-2.5">
          <p className="text-xs text-slate-600 font-medium uppercase tracking-widest mb-4">
            Pipeline
          </p>
          {STEP_ORDER.map((step) => {
            const status = completedSteps.has(step)
              ? "done"
              : activeStep === step
              ? "active"
              : "pending";
            return (
              <div key={step} className="flex items-center gap-2.5">
                <StepIcon status={status} />
                <span
                  className={`text-sm transition-colors ${
                    status === "done"
                      ? "text-emerald-400"
                      : status === "active"
                      ? "text-blue-300 font-medium"
                      : "text-slate-600"
                  }`}
                >
                  {STEP_LABELS[step]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Live log */}
        <div className="lg:col-span-2">
          <div
            ref={logRef}
            className="h-64 overflow-y-auto p-4 space-y-1.5 font-mono text-xs"
          >
            {logs.map((ev, i) => {
              if (ev.type === "step") {
                return (
                  <div key={i} className="text-blue-300 font-semibold animate-slide-in">
                    {">"} {ev.data.message}
                  </div>
                );
              }
              if (ev.type === "log") {
                return (
                  <div key={i} className="text-slate-500 animate-slide-in">
                    {"  "} {ev.data.message}
                  </div>
                );
              }
              return null;
            })}
            {phase === "analyzing" && (
              <span className="text-slate-700 blink">█</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
