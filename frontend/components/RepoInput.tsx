"use client";

import { useState, useEffect, useRef, FormEvent } from "react";

interface Props {
  onAnalyze: (url: string) => void;
  isLoading: boolean;
  defaultValue?: string;
}

const EXAMPLES = [
  "https://github.com/pallets/flask",
  "https://github.com/axios/axios",
  "https://github.com/encode/httpx",
];

const TYPE_SPEED = 90;
const DELETE_SPEED = 45;
const PAUSE_TYPED = 2200;
const PAUSE_DELETED = 600;

function usePlaceholderTyper() {
  const [text, setText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef({ index: 0, isDeleting: false, current: "" });

  useEffect(() => {
    const interval = setInterval(() => setShowCursor((v) => !v), 530);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const animate = () => {
      const s = stateRef.current;
      const phrase = EXAMPLES[s.index];
      if (!s.isDeleting) {
        s.current = phrase.slice(0, s.current.length + 1);
        setText(s.current);
        if (s.current.length === phrase.length) {
          timeoutRef.current = setTimeout(() => { s.isDeleting = true; animate(); }, PAUSE_TYPED);
        } else {
          timeoutRef.current = setTimeout(animate, TYPE_SPEED);
        }
      } else {
        s.current = phrase.slice(0, s.current.length - 1);
        setText(s.current);
        if (s.current.length === 0) {
          s.isDeleting = false;
          s.index = (s.index + 1) % EXAMPLES.length;
          timeoutRef.current = setTimeout(animate, PAUSE_DELETED);
        } else {
          timeoutRef.current = setTimeout(animate, DELETE_SPEED);
        }
      }
    };
    timeoutRef.current = setTimeout(animate, 900);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  return { text, showCursor };
}

export default function RepoInput({ onAnalyze, isLoading, defaultValue = "" }: Props) {
  const [url, setUrl] = useState(defaultValue);
  const [urlError, setUrlError] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const { text: placeholderText, showCursor } = usePlaceholderTyper();

  const validate = (val: string): boolean => {
    if (!val.trim()) { setUrlError("Please enter a GitHub URL"); return false; }
    if (!val.includes("github.com")) { setUrlError("Only GitHub URLs are supported"); return false; }
    setUrlError("");
    return true;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (validate(url)) onAnalyze(url.trim());
  };

  const showAnimatedPlaceholder = !url && !isFocused;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">

      {/* Input + Button row */}
      <div className="flex flex-col sm:flex-row gap-3">

        {/* Input */}
        <div className="flex-1">
          <div
            className="relative rounded-xl transition-all duration-200"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: urlError
                ? "1px solid rgba(239,68,68,0.4)"
                : isFocused
                ? "1px solid rgba(99,102,241,0.45)"
                : "1px solid rgba(255,255,255,0.07)",
              boxShadow: isFocused && !urlError
                ? "0 0 0 3px rgba(99,102,241,0.1)"
                : "none",
            }}
          >
            {/* GitHub icon */}
            <span
              className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10 transition-colors duration-200"
              style={{ color: isFocused ? "#818cf8" : "#475569" }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </span>

            {/* Animated placeholder */}
            {showAnimatedPlaceholder && (
              <div className="absolute left-11 right-4 top-1/2 -translate-y-1/2 pointer-events-none z-10 flex items-center overflow-hidden">
                <span className="text-sm font-mono text-slate-600 whitespace-nowrap">{placeholderText}</span>
                <span
                  className="ml-0.5 text-sm font-mono text-slate-500"
                  style={{ opacity: showCursor ? 1 : 0, transition: "opacity 0.1s" }}
                >|</span>
              </div>
            )}

            <input
              type="text"
              value={url}
              onChange={(e) => { setUrl(e.target.value); if (urlError) validate(e.target.value); }}
              placeholder=""
              disabled={isLoading}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="w-full pl-11 pr-4 py-4 rounded-xl text-slate-100 text-sm disabled:opacity-50 outline-none bg-transparent font-mono tracking-wide"
            />
          </div>

          {urlError && (
            <p className="text-red-400 text-xs mt-2 ml-1 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {urlError}
            </p>
          )}
        </div>

        {/* Analyze button */}
        <button
          type="submit"
          disabled={isLoading}
          className="sm:w-36 py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 shrink-0 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
            boxShadow: "0 4px 20px rgba(37,99,235,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.boxShadow = "0 6px 28px rgba(37,99,235,0.55), inset 0 1px 0 rgba(255,255,255,0.15)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "0 4px 20px rgba(37,99,235,0.35), inset 0 1px 0 rgba(255,255,255,0.15)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing
            </>
          ) : (
            <>
              {/* AI sparkle stars */}
              <svg className="w-9 h-9" viewBox="0 0 24 24" fill="currentColor">
                {/* Large 4-pointed star */}
                <path d="M10 3 L11.2 8.8 L17 10 L11.2 11.2 L10 17 L8.8 11.2 L3 10 L8.8 8.8 Z" />
                {/* Small 4-pointed star */}
                <path d="M19 13 L19.8 15.2 L22 16 L19.8 16.8 L19 19 L18.2 16.8 L16 16 L18.2 15.2 Z" />
              </svg>
              Analyze
            </>
          )}
        </button>
      </div>

      {/* Example pills */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-slate-600 text-xs font-medium">Try:</span>
        {EXAMPLES.map((ex) => {
          const [owner, repo] = ex.replace("https://github.com/", "").split("/");
          return (
            <button
              key={ex}
              type="button"
              onClick={() => setUrl(ex)}
              disabled={isLoading}
              className="text-xs px-3 py-1.5 rounded-full transition-all duration-200 disabled:opacity-40 flex items-center gap-1"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(99,102,241,0.08)";
                e.currentTarget.style.borderColor = "rgba(99,102,241,0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
              }}
            >
              <span className="text-slate-600">{owner}/</span>
              <span className="text-slate-400 font-medium">{repo}</span>
            </button>
          );
        })}
      </div>

    </form>
  );
}
