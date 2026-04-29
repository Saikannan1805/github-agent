"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  sessionId: string;
  apiUrl: string;
}

const SUGGESTIONS = [
  "What is the main purpose of this repository?",
  "How is the project structured?",
  "What are the main API endpoints?",
  "Are there any security concerns I should know about?",
  "How do I set up and run this project locally?",
  "What testing frameworks are used?",
];

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content:
    "Hi! I've analyzed this repository. Ask me anything about the codebase. I can find specific functions, explain patterns or answer architecture questions with exact file and line references.",
};

export default function ChatInterface({ sessionId, apiUrl }: Props) {
  const storageKey = `chat_history_${sessionId}`;

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [INITIAL_MESSAGE];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {}
  }, [messages, storageKey]);

  const sendMessage = async (question: string) => {
    if (!question.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: question.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(`${apiUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          question: question.trim(),
          history: messages.slice(-8),
        }),
      });

      if (res.status === 410) {
        throw new Error("SESSION_EXPIRED");
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Chat request failed");
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer },
      ]);
    } catch (err: unknown) {
      const isExpired = err instanceof Error && err.message === "SESSION_EXPIRED";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: isExpired
            ? "Session expired. Your analysis data was cleaned up after 2 hours. Please paste the repo URL again and re-analyze to continue chatting."
            : `Error: ${err instanceof Error ? err.message : String(err)}`,
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center gap-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-blue-300 text-sm shrink-0"
          style={{
            background: "rgba(59,130,246,0.15)",
            border: "1px solid rgba(59,130,246,0.3)",
          }}
        >
          ✦
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Chat with the Repo</h2>
          <p className="text-xs text-slate-600">RAG-powered · answers with file citations</p>
        </div>
      </div>

      {/* Messages */}
      <div className="h-96 overflow-y-auto p-5 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 animate-slide-in ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role === "assistant" && (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-blue-300 text-xs shrink-0 mt-0.5"
                style={{
                  background: "rgba(59,130,246,0.12)",
                  border: "1px solid rgba(59,130,246,0.25)",
                }}
              >
                ✦
              </div>
            )}
            <div
              className={`min-w-0 max-w-[80%] overflow-hidden rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"
              }`}
              style={
                msg.role === "user"
                  ? {
                      background: "linear-gradient(135deg, #2563eb, #4f46e5)",
                      color: "white",
                    }
                  : {
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }
              }
            >
              {msg.role === "assistant" ? (
                <div className="prose-dark text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
            {msg.role === "user" && (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 text-xs shrink-0 mt-0.5"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                you
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 animate-slide-in">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-blue-300 text-xs shrink-0"
              style={{
                background: "rgba(59,130,246,0.12)",
                border: "1px solid rgba(59,130,246,0.25)",
              }}
            >
              ✦
            </div>
            <div
              className="rounded-2xl rounded-tl-sm px-4 py-3"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-blue-400"
                    style={{ animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && (
        <div className="px-5 pb-3">
          <p className="text-xs text-slate-600 mb-2">Suggested questions</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                disabled={isLoading}
                className="text-xs px-3 py-1.5 rounded-full text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about this repository… (Enter to send, Shift+Enter for newline)"
            rows={1}
            disabled={isLoading}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none resize-none disabled:opacity-50 transition-all duration-200"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              minHeight: "44px",
              maxHeight: "120px",
            }}
            onFocus={(e) => {
              e.currentTarget.style.border = "1px solid rgba(59,130,246,0.4)";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
              e.currentTarget.style.boxShadow = "none";
            }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="btn-primary w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
