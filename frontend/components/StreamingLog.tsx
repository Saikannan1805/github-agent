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
      <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center">
        <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-500 flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
      </span>
    );
  }
  return (
    <span className="w-5 h-5 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center">
      <span className="w-2 h-2 rounded-full bg-slate-500" />
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

  // Compute step statuses
  const completedSteps = new Set<string>();
  let activeStep: string | null = null;

  for (const ev of events) {
    if (ev.type === "progress" && ev.data.percent === 100) {
      completedSteps.add(ev.data.step);
    }
    if (ev.type === "step") {
      activeStep = ev.data.step;
    }
  }
  if (phase === "done") activeStep = null;

  const logs = events.filter((e) => e.type === "log" || e.type === "step");

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-700 flex items-center gap-3">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500/70" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <span className="w-3 h-3 rounded-full bg-green-500/70" />
        </div>
        <span className="text-slate-400 text-sm font-mono">agent.log</span>
        {phase === "analyzing" && (
          <span className="ml-auto text-xs text-sky-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-700">
        {/* Step tracker */}
        <div className="p-5 space-y-2">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3">
            Pipeline Steps
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
                  className={`text-sm ${
                    status === "done"
                      ? "text-emerald-400"
                      : status === "active"
                      ? "text-sky-300 font-medium"
                      : "text-slate-500"
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
                  <div key={i} className="text-sky-300 font-semibold animate-slide-in">
                    {">"} {ev.data.message}
                  </div>
                );
              }
              if (ev.type === "log") {
                return (
                  <div key={i} className="text-slate-400 animate-slide-in">
                    {"  "} {ev.data.message}
                  </div>
                );
              }
              return null;
            })}
            {phase === "analyzing" && (
              <span className="text-slate-600 blink">█</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
