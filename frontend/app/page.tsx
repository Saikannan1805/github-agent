"use client";

import { useState, useCallback, useEffect } from "react";
import RepoInput from "@/components/RepoInput";
import StreamingLog from "@/components/StreamingLog";
import ReportTabs from "@/components/ReportTabs";
import ChatInterface from "@/components/ChatInterface";
import DemoTerminal from "@/components/DemoTerminal";
import AboutPanel from "@/components/AboutPanel";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const STORAGE_KEY = "github_analyzer_session";

export type AnalysisEvent =
  | { type: "step"; data: { step: string; message: string } }
  | { type: "log"; data: { message: string } }
  | { type: "progress"; data: { step: string; percent: number } }
  | { type: "report"; data: { type: string; data: unknown } }
  | { type: "done"; data: { message: string } }
  | { type: "error"; data: { message: string } };

export type Reports = {
  architecture?: unknown;
  security?: unknown;
  quality?: unknown;
  readme?: unknown;
};

type Phase = "idle" | "queued" | "analyzing" | "done" | "error";
type ServerStatus = "unknown" | "warming" | "ready";



export default function HomePage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [events, setEvents] = useState<AnalysisEvent[]>([]);
  const [reports, setReports] = useState<Reports>({});
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [serverStatus, setServerStatus] = useState<ServerStatus>("unknown");
  const [submittedUrl, setSubmittedUrl] = useState<string>("");
  const [queuedUrl, setQueuedUrl] = useState<string>("");
  const [showAbout, setShowAbout] = useState(false);

  // Disable browser scroll restoration so mobile doesn't jump on refresh
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
  }, []);

  // Restore last session from localStorage on page load
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { sessionId: sid, reports: savedReports } = JSON.parse(saved);
        if (sid && savedReports && Object.keys(savedReports).length > 0) {
          setSessionId(sid);
          setReports(savedReports);
          setPhase("done");
        }
      }
    } catch {
      // ignore corrupt storage
    }
  }, []);

  // Ping backend on page load to wake it up early
  useEffect(() => {
    setServerStatus("warming");
    const ping = async () => {
      try {
        await fetch(`${API}/health`);
        setServerStatus("ready");
      } catch {
        setServerStatus("warming");
        setTimeout(ping, 10000);
      }
    };
    ping();
  }, []);

  // Auto-fire queued analysis once server becomes ready
  useEffect(() => {
    if (serverStatus === "ready" && queuedUrl) {
      setQueuedUrl("");
      handleAnalyze(queuedUrl);
    }
  }, [serverStatus, queuedUrl]);

  const handleReset = useCallback(() => {
    setPhase("idle");
    setSessionId(null);
    setEvents([]);
    setReports({});
    setErrorMsg("");
    setQueuedUrl("");
    setSubmittedUrl("");
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleAnalyze = useCallback(async (repoUrl: string) => {
    if (serverStatus !== "ready") {
      setQueuedUrl(repoUrl);
      setSubmittedUrl(repoUrl);
      setPhase("queued");
      return;
    }
    setPhase("analyzing");
    setSubmittedUrl(repoUrl);
    setEvents([]);
    setReports({});
    setErrorMsg("");
    setSessionId(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}

    try {
      // 1. Start analysis
      const res = await fetch(`${API}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to start analysis");
      }

      const { session_id } = await res.json();
      setSessionId(session_id);

      // 2. Open SSE stream
      const es = new EventSource(`${API}/stream/${session_id}`);
      let handled = false;

      es.onmessage = (e) => {
        const event: AnalysisEvent = JSON.parse(e.data);
        setEvents((prev) => [...prev, event]);

        if (event.type === "report") {
          const r = event as { type: "report"; data: { type: string; data: unknown } };
          setReports((prev) => ({ ...prev, [r.data.type]: r.data.data }));
        }

        if (event.type === "done") {
          handled = true;
          setPhase("done");
          es.close();
          setReports((prev) => {
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionId: session_id, reports: prev }));
            } catch {}
            return prev;
          });
        }

        if (event.type === "error") {
          handled = true;
          setPhase("error");
          setErrorMsg((event as { type: "error"; data: { message: string } }).data.message);
          es.close();
        }
      };

      es.onerror = async () => {
        if (handled) return;
        es.close();
        try {
          const s = await fetch(`${API}/status/${session_id}`);
          const data = await s.json();
          setPhase("error");
          setErrorMsg(data.error || "Analysis failed — check the backend logs.");
        } catch {
          setPhase("error");
          setErrorMsg("Connection to server lost. Check the backend is running.");
        }
      };
    } catch (err: unknown) {
      setPhase("error");
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  }, []);

  return (
    <div className="space-y-8">

      {/* Hero — only on idle */}
      {phase === "idle" && (
        <div className="animate-fade-up">
          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-10 xl:gap-16 items-stretch pt-8 pb-10">

            {/* Left — branding + headline + description + badges */}
            <div className="flex flex-col justify-center gap-7">

              {/* Brand mark + name */}
              <div className="flex items-center gap-3.5">
                <div className="relative flex items-center justify-center shrink-0">
                  <div className="absolute w-20 h-20 rounded-2xl" style={{ background: "rgba(37,99,235,0.18)", filter: "blur(14px)" }} />
                  <div
                    className="relative w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #2563eb 0%, #6366f1 100%)", boxShadow: "0 6px 24px rgba(37,99,235,0.45), inset 0 1px 0 rgba(255,255,255,0.18)" }}
                  >
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span
                    className="text-2xl font-bold tracking-tight leading-none"
                    style={{ background: "linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
                  >
                    Gitwise
                  </span>
                  <span className="text-xs text-slate-600 mt-0.5 font-mono tracking-wide">AI · Codebase Intelligence</span>
                </div>
              </div>

              {/* Headline */}
              <div className="flex flex-col gap-3">
                <h1 className="text-[2.6rem] sm:text-5xl lg:text-[3.2rem] xl:text-[3.6rem] font-bold tracking-tight text-white leading-[1.05]">
                  Understand any<br />
                  <span className="gradient-text">GitHub repo</span><br />
                  instantly.
                </h1>
                <p className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-sm">
                  Paste a URL. Get a full AI-powered breakdown of architecture,
                  security, and code quality — then chat with the codebase.
                </p>
              </div>

              {/* Feature badges */}
              <div className="flex flex-wrap gap-2">
                {[
                  { icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7", label: "Architecture Map" },
                  { icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z", label: "Security Scan" },
                  { icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", label: "Code Quality" },
                  { icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", label: "Auto README" },
                  { icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z", label: "AI Chat" },
                ].map(({ icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-1.5 text-xs text-slate-400 px-3 py-1.5 rounded-full"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={icon} />
                    </svg>
                    {label}
                  </div>
                ))}
              </div>

              {/* Learn More button */}
              <button
                onClick={() => setShowAbout(true)}
                className="group flex items-center gap-2.5 w-fit text-sm font-medium transition-all duration-200"
                style={{ color: "#94a3b8" }}
                onMouseEnter={(e) => e.currentTarget.style.color = "#e2e8f0"}
                onMouseLeave={(e) => e.currentTarget.style.color = "#94a3b8"}
              >
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 group-hover:scale-110"
                  style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}
                >
                  <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                Learn more about this project
                <svg
                  className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1 text-indigo-400"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Right — demo terminal */}
            <div className="w-full min-h-[420px] lg:min-h-0">
              <DemoTerminal />
            </div>
          </div>

          {/* Divider with label */}
          <div className="flex items-center gap-4 mb-5">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
            <span className="text-xs text-slate-600 font-mono tracking-widest uppercase">Try it yourself</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
          </div>

          {/* Input — full width below both columns */}
          <RepoInput onAnalyze={handleAnalyze} isLoading={false} />
        </div>
      )}

      {/* Input — shown during non-idle phases */}
      {phase !== "idle" && (
        <RepoInput onAnalyze={handleAnalyze} isLoading={phase === "analyzing" || phase === "queued"} defaultValue={submittedUrl} />
      )}

      {/* Queued banner — waiting for server to warm up */}
      {phase === "queued" && (
        <div
          className="rounded-2xl p-5 animate-slide-in flex items-center gap-4"
          style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <span className="relative flex w-3 h-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full w-3 h-3 bg-amber-400" />
          </span>
          <div>
            <p className="text-amber-400 font-medium text-sm">Waiting for server to wake up...</p>
            <p className="text-amber-400/60 text-xs mt-0.5">Your analysis will start automatically once the server is ready.</p>
          </div>
        </div>
      )}

      {/* Error banner */}
      {phase === "error" && errorMsg && (
        <div
          className="rounded-2xl p-5 text-red-300 animate-slide-in"
          style={{
            background: "rgba(220,38,38,0.08)",
            border: "1px solid rgba(220,38,38,0.25)",
          }}
        >
          <strong className="text-red-400">Error:</strong> {errorMsg}
        </div>
      )}

      {/* Live streaming log */}
      {(phase === "analyzing" || phase === "done" || phase === "error") &&
        events.length > 0 && (
          <StreamingLog events={events} phase={phase} />
        )}

      {/* Reports */}
      {Object.keys(reports).length > 0 && (
        <div className="animate-slide-in">
          <ReportTabs reports={reports} />
        </div>
      )}

      {/* Chat — only show when analysis fully completed */}
      {sessionId && phase === "done" && (
        <div className="animate-slide-in">
          <ChatInterface sessionId={sessionId} apiUrl={API} />
        </div>
      )}

      {/* Floating "New Analysis" button — slides in when results are showing */}
      {(phase === "done" || phase === "error") && (
        <button
          onClick={handleReset}
          className="fixed top-4 right-5 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white animate-fade-in"
          style={{
            background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
            boxShadow: "0 4px 20px rgba(37,99,235,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 6px 28px rgba(37,99,235,0.5), inset 0 1px 0 rgba(255,255,255,0.15)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "0 4px 20px rgba(37,99,235,0.35), inset 0 1px 0 rgba(255,255,255,0.15)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          New Analysis
        </button>
      )}

      {/* Fixed server status indicator — always visible, bottom-right */}
      <div
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
        style={{
          background:
            serverStatus === "ready"   ? "rgba(16,185,129,0.12)" :
            serverStatus === "warming" ? "rgba(245,158,11,0.12)" :
                                         "rgba(100,116,139,0.10)",
          border:
            serverStatus === "ready"   ? "1px solid rgba(16,185,129,0.25)" :
            serverStatus === "warming" ? "1px solid rgba(245,158,11,0.25)" :
                                         "1px solid rgba(100,116,139,0.2)",
          backdropFilter: "blur(12px)",
        }}
      >
        {serverStatus === "ready" && (
          <>
            <span className="relative flex w-2.5 h-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
              <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-emerald-400" />
            </span>
            <span className="text-emerald-400">Server ready</span>
          </>
        )}
        {serverStatus === "warming" && (
          <>
            <span className="relative flex w-2.5 h-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-90" />
              <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-amber-400" />
            </span>
            <span className="text-amber-400">Warming up</span>
          </>
        )}
        {serverStatus === "unknown" && (
          <>
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
            <span className="text-slate-500">Connecting...</span>
          </>
        )}
      </div>

      {/* About panel */}
      {showAbout && <AboutPanel onClose={() => setShowAbout(false)} />}
    </div>
  );
}
