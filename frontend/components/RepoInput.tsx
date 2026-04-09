"use client";

import { useState, FormEvent } from "react";

interface Props {
  onAnalyze: (url: string) => void;
  isLoading: boolean;
}

const EXAMPLES = [
  "https://github.com/tiangolo/fastapi",
  "https://github.com/vercel/next.js",
  "https://github.com/langchain-ai/langgraph",
];

export default function RepoInput({ onAnalyze, isLoading }: Props) {
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");

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
    if (validate(url)) {
      onAnalyze(url.trim());
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 select-none">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </span>
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (urlError) validate(e.target.value);
                }}
                placeholder="https://github.com/owner/repository"
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent disabled:opacity-50 transition"
              />
            </div>
            {urlError && (
              <p className="text-red-400 text-sm mt-1.5">{urlError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="sm:w-40 py-3 px-6 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
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
          <span className="text-slate-500 text-xs">Try:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setUrl(ex)}
              disabled={isLoading}
              className="text-xs px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition disabled:opacity-40"
            >
              {ex.replace("https://github.com/", "")}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
