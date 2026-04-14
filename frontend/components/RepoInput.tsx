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
  // Keep mutable state in refs — never inside setState updaters
  const stateRef = useRef({ index: 0, isDeleting: false, current: "" });

  // Blinking cursor
  useEffect(() => {
    const interval = setInterval(() => setShowCursor((v) => !v), 530);
    return () => clearInterval(interval);
  }, []);

  // Typewriter loop — no side effects inside setState
  useEffect(() => {
    const animate = () => {
      const s = stateRef.current;
      const phrase = EXAMPLES[s.index];

      if (!s.isDeleting) {
        s.current = phrase.slice(0, s.current.length + 1);
        setText(s.current);
        if (s.current.length === phrase.length) {
          timeoutRef.current = setTimeout(() => {
            s.isDeleting = true;
            animate();
          }, PAUSE_TYPED);
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
    if (!val.trim()) {
      setUrlError("Please enter a GitHub URL");
      return false;
    }
    if (!val.includes("github.com")) {
      setUrlError("Only GitHub URLs are supported");
      return false;
    }
    setUrlError("");
    return true;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (validate(url)) onAnalyze(url.trim());
  };

  const showAnimatedPlaceholder = !url && !isFocused;

  return (
    <div className="glass rounded-2xl p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              {/* GitHub icon */}
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 select-none pointer-events-none z-10">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </span>

              {/* Animated placeholder — shown when empty and unfocused */}
              {showAnimatedPlaceholder && (
                <div className="absolute left-10 top-1/2 -translate-y-1/2 pointer-events-none z-10 flex items-center">
                  <span className="text-sm font-mono text-slate-500">
                    {placeholderText}
                  </span>
                  <span
                    className="ml-0.5 text-sm font-mono text-slate-400"
                    style={{ opacity: showCursor ? 1 : 0, transition: "opacity 0.1s" }}
                  >
                    _
                  </span>
                </div>
              )}

              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (urlError) validate(e.target.value);
                }}
                placeholder=""
                disabled={isLoading}
                onFocus={(e) => {
                  setIsFocused(true);
                  if (!urlError) {
                    e.currentTarget.style.border = "1px solid rgba(59,130,246,0.5)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.12)";
                  }
                }}
                onBlur={(e) => {
                  setIsFocused(false);
                  e.currentTarget.style.border = urlError
                    ? "1px solid rgba(239,68,68,0.5)"
                    : "1px solid rgba(255,255,255,0.08)";
                  e.currentTarget.style.boxShadow = "none";
                }}
                className="w-full pl-10 pr-4 py-3 rounded-xl text-slate-100 disabled:opacity-50 transition-all duration-200 outline-none relative z-0"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: urlError
                    ? "1px solid rgba(239,68,68,0.5)"
                    : "1px solid rgba(255,255,255,0.08)",
                }}
              />
            </div>
            {urlError && (
              <p className="text-red-400 text-sm mt-1.5 ml-1">{urlError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary sm:w-40 py-3 px-6 rounded-xl flex items-center justify-center gap-2 shrink-0"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Analyze
              </>
            )}
          </button>
        </div>

        {/* Example repos */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-slate-600 text-xs">Try:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setUrl(ex)}
              disabled={isLoading}
              className="text-xs px-3 py-1 rounded-full text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
              }}
            >
              {ex.replace("https://github.com/", "")}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
