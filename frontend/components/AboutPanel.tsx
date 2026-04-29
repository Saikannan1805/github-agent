"use client";

import { useEffect, useState } from "react";

const FORMSPREE_ID = "xbdqjwdd";

interface Props {
  onClose: () => void;
}

const STACK_GROUPS = [
  {
    group: "Frontend",
    color: "#3b82f6",
    items: [
      { name: "Next.js 15",   role: "React frontend framework", color: "#ffffff", bg: "rgba(255,255,255,0.07)", border: "rgba(255,255,255,0.12)" },
      { name: "TypeScript",   role: "Type-safe frontend",       color: "#3b82f6", bg: "rgba(59,130,246,0.1)",   border: "rgba(59,130,246,0.25)"  },
      { name: "Tailwind CSS", role: "Utility-first styling",    color: "#38bdf8", bg: "rgba(56,189,248,0.1)",   border: "rgba(56,189,248,0.25)"  },
    ],
  },
  {
    group: "Backend",
    color: "#009688",
    items: [
      { name: "FastAPI",    role: "Async Python backend",          color: "#009688", bg: "rgba(0,150,136,0.1)",  border: "rgba(0,150,136,0.25)"  },
      { name: "GitPython",  role: "Repo cloning & file ops",       color: "#f43f5e", bg: "rgba(244,63,94,0.1)",  border: "rgba(244,63,94,0.25)"  },
      { name: "SSE",        role: "Real-time streaming to browser", color: "#06b6d4", bg: "rgba(6,182,212,0.1)", border: "rgba(6,182,212,0.25)"  },
    ],
  },
  {
    group: "AI / ML",
    color: "#a78bfa",
    items: [
      { name: "LangGraph",                 role: "Agent orchestration pipeline",    color: "#a78bfa", bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.25)" },
      { name: "LangChain",                 role: "LLM abstraction layer",           color: "#84cc16", bg: "rgba(132,204,22,0.1)",  border: "rgba(132,204,22,0.25)"  },
      { name: "Groq · LLaMA 3.3 70B",     role: "Ultra-fast LLM inference",        color: "#f97316", bg: "rgba(249,115,22,0.1)",  border: "rgba(249,115,22,0.25)"  },
      { name: "HuggingFace",               role: "Embeddings (all-MiniLM-L6-v2)",   color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.25)"  },
    ],
  },
  {
    group: "Database",
    color: "#3ecf8e",
    items: [
      { name: "Supabase pgvector", role: "Vector store for RAG", color: "#3ecf8e", bg: "rgba(62,207,142,0.1)", border: "rgba(62,207,142,0.25)" },
    ],
  },
  {
    group: "Infrastructure",
    color: "#818cf8",
    items: [
      { name: "Vercel",           role: "Frontend hosting",           color: "#818cf8", bg: "rgba(129,140,248,0.1)", border: "rgba(129,140,248,0.25)" },
      { name: "Render",           role: "Backend hosting",            color: "#a78bfa", bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.25)" },
      { name: "Vercel Analytics", role: "Page views & performance",   color: "#64748b", bg: "rgba(100,116,139,0.1)", border: "rgba(100,116,139,0.25)" },
    ],
  },
];

const FEATURES = [
  { icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7", label: "Architecture Analysis", desc: "Languages, frameworks, patterns, folder structure", color: "#3b82f6" },
  { icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z", label: "Security Scanning", desc: "Regex-based detection of secrets, SQLi, XSS, injections", color: "#f43f5e" },
  { icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", label: "Code Quality", desc: "Complexity, test coverage, grade A–F scoring", color: "#a78bfa" },
  { icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", label: "Auto README", desc: "AI-generated professional README with full setup guide", color: "#3ecf8e" },
  { icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z", label: "RAG-powered Chat", desc: "Semantic search over the entire codebase with citations", color: "#f97316" },
  { icon: "M13 10V3L4 14h7v7l9-11h-7z", label: "Real-time Streaming", desc: "SSE pipeline. Live progress updates as analysis runs", color: "#fbbf24" },
  { icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4", label: "Export Reports", desc: "Download any report as Markdown or JSON per-tab, or grab everything as a ZIP. Ready for CI/CD, PR review bots or LLM pipelines", color: "#10b981" },
];

const LINKS = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/saikannansathish",
    icon: "M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z",
    gradient: "linear-gradient(135deg, #0077b5, #00a0dc)",
    shadow: "rgba(0,119,181,0.35)",
  },
];

export default function AboutPanel({ onClose }: Props) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return;
    setSubmitState("sending");
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: `${rating} / 5 stars`,
          name: name || "Anonymous",
          email: email || "Not provided",
          message: message || "(no message)",
        }),
      });
      setSubmitState(res.ok ? "sent" : "error");
    } catch {
      setSubmitState("error");
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 animate-backdrop"
        style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 animate-panel-up"
        style={{ maxWidth: "720px", margin: "0 auto" }}
      >
        <div
          className="rounded-t-3xl overflow-hidden"
          style={{
            background: "rgba(4,8,20,0.98)",
            border: "1px solid rgba(148,163,184,0.1)",
            borderBottom: "none",
            boxShadow: "0 -24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.15)",
          }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
          </div>

          <div className="px-6 sm:px-8 pb-10 pt-2 space-y-8 max-h-[88vh] overflow-y-auto">

            {/* ── Header ── */}
            <div className="stagger-1 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg, #2563eb 0%, #6366f1 100%)", boxShadow: "0 4px 16px rgba(37,99,235,0.4)" }}
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Gitwise</h2>
                  <p className="text-xs text-slate-500 font-mono">AI · Codebase Intelligence</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* ── About ── */}
            <div className="stagger-2 space-y-2">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">What is Gitwise?</h3>
              <p
                className="text-slate-300 text-sm leading-relaxed"
                style={{ borderLeft: "2px solid rgba(99,102,241,0.5)", paddingLeft: "14px" }}
              >
                Gitwise is a full-stack AI-powered GitHub repository analyzer. Paste any public GitHub URL and get a comprehensive breakdown of architecture, security vulnerabilities and code quality. Powered by a LangGraph agent pipeline with Groq LLaMA inference. Chat with the codebase using RAG and export any report as Markdown, JSON or a full ZIP bundle. Ready to plug into CI/CD pipelines, PR review bots or LLM workflows.
              </p>
            </div>

            {/* ── Pipeline flow ── */}
            <div className="stagger-3 space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">How it works</h3>
              <div className="flex flex-col sm:flex-row gap-2">
                {[
                  { step: "01", label: "Clone",        desc: "Shallow git clone, file filtering (500 file / 100k line limit)" },
                  { step: "02", label: "Embed",         desc: "80-line overlapping chunks → HuggingFace embeddings → Supabase pgvector" },
                  { step: "03", label: "Analyze",       desc: "LangGraph agents: architecture, security scan, quality metrics" },
                  { step: "04", label: "README",        desc: "LLM synthesizes a full professional README from all reports" },
                  { step: "05", label: "Chat",          desc: "Semantic search + filepath search → RAG response with citations" },
                  { step: "06", label: "Export",        desc: "Download per-tab MD / JSON or full ZIP. Drop into CI, PR bots or LLM prompts" },
                ].map(({ step, label, desc }, i, arr) => (
                  <div key={step} className="flex sm:flex-col gap-3 sm:gap-1 flex-1">
                    <div className="flex sm:flex-col items-center sm:items-start gap-1 sm:gap-0">
                      {i < arr.length - 1 && (
                        <div className="hidden sm:flex items-center w-full mb-2">
                          <div className="flex-1 h-px" style={{ background: "rgba(99,102,241,0.25)" }} />
                          <svg className="w-2.5 h-2.5 text-indigo-500 shrink-0" fill="currentColor" viewBox="0 0 6 10">
                            <path d="M0 0l6 5-6 5V0z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div
                      className="rounded-xl p-3 flex flex-col gap-1 flex-1"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <span className="text-xs font-mono text-indigo-400">{step}</span>
                      <span className="text-sm font-semibold text-white">{label}</span>
                      <span className="text-xs text-slate-500 leading-relaxed">{desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Features ── */}
            <div className="stagger-4 space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Features</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FEATURES.map(({ icon, label, desc, color }) => (
                  <div
                    key={label}
                    className="rounded-xl p-3.5 flex gap-3"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `${color}18`, border: `1px solid ${color}30` }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke={color} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={icon} />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{label}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Tech Stack ── */}
            <div className="stagger-4 space-y-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Tech Stack</h3>
              <div className="space-y-4">
                {STACK_GROUPS.map(({ group, color, items }) => (
                  <div key={group}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color }}>{group}</span>
                      <div className="flex-1 h-px" style={{ background: `${color}20` }} />
                    </div>
                    <div className="flex flex-wrap gap-2 pl-3.5">
                      {items.map(({ name, role, color: c, bg, border }) => (
                        <div
                          key={name}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs"
                          style={{ background: bg, border: `1px solid ${border}` }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c }} />
                          <span className="font-semibold" style={{ color: c }}>{name}</span>
                          <span className="text-slate-500">— {role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Built by ── */}
            <div className="stagger-5 space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Built by</h3>
              <div
                className="rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(99,102,241,0.2)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                }}
              >
                <div className="flex flex-col gap-1.5">
                  <span className="text-white font-semibold text-base">Saikannan Sathish</span>
                  <span className="text-slate-400 text-sm">Full-stack developer · AI enthusiast</span>
                  <span
                    className="text-xs px-2.5 py-1 rounded-full w-fit font-medium"
                    style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", color: "#34d399" }}
                  >
                    Open to opportunities
                  </span>
                </div>
                <div className="flex gap-2.5 flex-wrap">
                  {LINKS.map(({ label, href, icon, gradient, shadow }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5"
                      style={{ background: gradient, boxShadow: `0 4px 14px ${shadow}` }}
                      onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.15)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.filter = "brightness(1)"; }}
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d={icon} />
                      </svg>
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Feedback ── */}
            <div className="stagger-5 space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Share your feedback</h3>

              {submitState === "sent" ? (
                <div
                  className="rounded-2xl p-6 flex flex-col items-center gap-2 text-center animate-slide-in"
                  style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mb-1"
                    style={{ background: "rgba(16,185,129,0.15)" }}
                  >
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-emerald-400 font-semibold">Thanks for the feedback!</p>
                  <p className="text-slate-500 text-xs">It means a lot and helps improve the project.</p>
                </div>
              ) : (
                <form
                  onSubmit={handleFeedback}
                  className="rounded-2xl p-5 space-y-4"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  {/* Star rating */}
                  <div className="space-y-1.5">
                    <p className="text-xs text-slate-500">How would you rate this project?</p>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHovered(star)}
                          onMouseLeave={() => setHovered(0)}
                          className="transition-all duration-150 hover:scale-125"
                        >
                          <svg
                            className="w-7 h-7"
                            fill={(hovered || rating) >= star ? "#fbbf24" : "none"}
                            stroke={(hovered || rating) >= star ? "#fbbf24" : "#475569"}
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                            />
                          </svg>
                        </button>
                      ))}
                      {rating > 0 && (
                        <span className="text-xs text-amber-400 self-center ml-1 animate-fade-in">
                          {["", "Poor", "Fair", "Good", "Great", "Excellent!"][rating]}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Name + Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { label: "Name", placeholder: "Your name", value: name, onChange: setName, type: "text" },
                      { label: "Email", placeholder: "your@email.com", value: email, onChange: setEmail, type: "email" },
                    ].map(({ label, placeholder, value, onChange, type }) => (
                      <div key={label} className="space-y-1.5">
                        <p className="text-xs text-slate-500">{label} <span className="text-slate-600">(optional)</span></p>
                        <input
                          type={type}
                          value={value}
                          onChange={(e) => onChange(e.target.value)}
                          placeholder={placeholder}
                          className="w-full rounded-xl px-4 py-2.5 text-sm text-slate-300 placeholder-slate-600 outline-none transition-all duration-200"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                          onFocus={(e) => { e.currentTarget.style.border = "1px solid rgba(99,102,241,0.4)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)"; }}
                          onBlur={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"; e.currentTarget.style.boxShadow = "none"; }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Message */}
                  <div className="space-y-1.5">
                    <p className="text-xs text-slate-500">Anything to add? <span className="text-slate-600">(optional)</span></p>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      placeholder="What did you think? Any suggestions?"
                      className="w-full rounded-xl px-4 py-3 text-sm text-slate-300 placeholder-slate-600 outline-none resize-none transition-all duration-200"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                      onFocus={(e) => { e.currentTarget.style.border = "1px solid rgba(99,102,241,0.4)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)"; }}
                      onBlur={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"; e.currentTarget.style.boxShadow = "none"; }}
                    />
                  </div>

                  {/* Submit */}
                  <div className="flex items-center justify-between">
                    {submitState === "error" && (
                      <p className="text-xs text-red-400">Something went wrong. Try again.</p>
                    )}
                    <button
                      type="submit"
                      disabled={!rating || submitState === "sending"}
                      className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5"
                      style={{
                        background: "linear-gradient(135deg, #2563eb 0%, #6366f1 100%)",
                        boxShadow: rating ? "0 4px 14px rgba(37,99,235,0.35)" : "none",
                      }}
                    >
                      {submitState === "sending" ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          Send Feedback
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
