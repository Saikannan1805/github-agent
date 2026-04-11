"use client";

import { useState, useCallback, useEffect } from "react";
import RepoInput from "@/components/RepoInput";
import StreamingLog from "@/components/StreamingLog";
import ReportTabs from "@/components/ReportTabs";
import ChatInterface from "@/components/ChatInterface";

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

type Phase = "idle" | "analyzing" | "done" | "error";
type ServerStatus = "unknown" | "warming" | "ready";

export default function HomePage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [events, setEvents] = useState<AnalysisEvent[]>([]);
  const [reports, setReports] = useState<Reports>({});
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [serverStatus, setServerStatus] = useState<ServerStatus>("unknown");

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

  const handleAnalyze = useCallback(async (repoUrl: string) => {
    setPhase("analyzing");
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
          // Persist session to localStorage so reports survive a refresh
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
        // Fetch the real error from the backend instead of showing a generic message
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
      {/* Server warm-up indicator */}
      {serverStatus === "warming" && (
        <div className="flex items-center justify-center gap-2 text-xs text-amber-400 bg-amber-950/30 border border-amber-500/20 rounded-lg px-4 py-2 animate-pulse w-fit mx-auto">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
          Warming up server — first analysis may take a moment...
        </div>
      )}
      {serverStatus === "ready" && phase === "idle" && (
        <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 rounded-lg px-4 py-2 w-fit mx-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          Server ready
        </div>
      )}

      {/* Hero */}
      {phase === "idle" && (
        <div className="text-center py-8 animate-slide-in">
          <h1 className="text-4xl font-bold text-slate-100 mb-3">
            Analyze Any GitHub Repo
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Paste a GitHub URL and get an instant AI-powered deep dive:{" "}
            <span className="text-sky-400">architecture</span>,{" "}
            <span className="text-red-400">security</span>,{" "}
            <span className="text-green-400">code quality</span>, and a
            generated <span className="text-purple-400">README</span>.
          </p>
        </div>
      )}

      {/* Input */}
      <RepoInput onAnalyze={handleAnalyze} isLoading={phase === "analyzing"} />

      {/* Error banner */}
      {phase === "error" && errorMsg && (
        <div className="bg-red-950/60 border border-red-500/40 rounded-xl p-4 text-red-300 animate-slide-in">
          <strong>Error:</strong> {errorMsg}
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
    </div>
  );
}
