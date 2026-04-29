"use client";

import { useEffect, useRef, useState } from "react";

const CARDS = [
  {
    id: "cicd",
    num: "01",
    title: "CI/CD Gates",
    desc: "Block risky PRs automatically. Security JSON → GitHub Actions → failed check → blocked merge.",
    color: "#a5b4fc",
    bg: "rgba(99,102,241,0.11)",
    border: "rgba(99,102,241,0.28)",
    pos: { left: "3%", top: "12%" } as React.CSSProperties,
    line: { x: 19, y: 27 },
    from: { x: -24, y: -14 },
    metric: 0,
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
  {
    id: "pr",
    num: "02",
    title: "PR Review",
    desc: "Risk badge, quality grade and issue count auto-posted to every PR. No context switching.",
    color: "#93c5fd",
    bg: "rgba(59,130,246,0.11)",
    border: "rgba(59,130,246,0.28)",
    pos: { right: "3%", top: "12%" } as React.CSSProperties,
    line: { x: 81, y: 27 },
    from: { x: 24, y: -14 },
    metric: 1,
    icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
  },
  {
    id: "tracking",
    num: "03",
    title: "Quality Tracking",
    desc: "Every merge writes a quality snapshot to Supabase. Chart your score across commits over time.",
    color: "#6ee7b7",
    bg: "rgba(16,185,129,0.11)",
    border: "rgba(16,185,129,0.28)",
    pos: { left: "3%", bottom: "12%" } as React.CSSProperties,
    line: { x: 19, y: 73 },
    from: { x: -24, y: 14 },
    metric: 2,
    icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  },
  {
    id: "llm",
    num: "04",
    title: "LLM Auto-fix",
    desc: "Feed findings into Claude. Get file-level fix suggestions with code examples in seconds.",
    color: "#fcd34d",
    bg: "rgba(245,158,11,0.11)",
    border: "rgba(245,158,11,0.28)",
    pos: { right: "3%", bottom: "12%" } as React.CSSProperties,
    line: { x: 81, y: 73 },
    from: { x: 24, y: 14 },
    metric: 3,
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
];

const METRICS = [
  { label: "Security Risk", value: "LOW",     color: "#34d399" },
  { label: "Quality Score", value: "89/100",  color: "#a5b4fc" },
  { label: "Code Grade",    value: "A",        color: "#93c5fd" },
  { label: "Findings",      value: "3 issues", color: "#fcd34d" },
];

export default function UseCaseShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const [reportVisible, setReportVisible] = useState(false);
  const [cardsVisible,  setCardsVisible]  = useState(false);
  const activeMetric = -1;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setReportVisible(true);
          setTimeout(() => setCardsVisible(true), 180);
        }
      },
      { threshold: 0.5 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} style={{ height: "100vh" }}>
      <div
        style={{
          position: "relative",
          height: "100%",
          overflow: "hidden",
          background: "transparent",
        }}
      >
        {/* Soft centre vignette — just enough to make the report pop */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 50% 60% at 50% 50%, rgba(3,7,18,0.55) 0%, transparent 100%)",
          }}
        />


        {/* Section label */}
        <div
          className="absolute top-7 left-1/2 -translate-x-1/2 z-10"
          style={{ opacity: reportVisible ? 1 : 0, transition: "opacity 0.6s ease", textAlign: "center" }}
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <span className="text-xs text-slate-500 font-medium tracking-wide">What you can build with it</span>
          </div>
        </div>

        {/* ── SVG connecting lines (desktop) ── */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none hidden md:block"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ zIndex: 2 }}
        >
          {CARDS.map((card, i) => (
            <line
              key={card.id}
              x1={50} y1={50}
              x2={card.line.x} y2={card.line.y}
              stroke={card.color}
              strokeWidth="0.13"
              strokeOpacity={cardsVisible ? 0.28 : 0}
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset={cardsVisible ? "0" : "1"}
              style={{
                transition: cardsVisible
                  ? `stroke-dashoffset 0.7s cubic-bezier(0.16,1,0.3,1) ${150 + i * 80}ms, stroke-opacity 0.3s ease ${150 + i * 80}ms`
                  : "none",
              }}
            />
          ))}
          {/* Dot at report center */}
          <circle
            cx="50" cy="50" r="0.4"
            fill="rgba(148,163,184,0.2)"
            style={{ opacity: reportVisible ? 1 : 0, transition: "opacity 0.5s ease 0.3s" }}
          />
        </svg>

        {/* ── Center report mockup (desktop) ── */}
        <div
          className="absolute z-10 hidden md:block"
          style={{
            left: "50%",
            top: "50%",
            transform: `translate(-50%, -50%) scale(${reportVisible ? 1 : 0.92})`,
            opacity: reportVisible ? 1 : 0,
            transition: "opacity 0.7s ease 0s, transform 0.7s cubic-bezier(0.16,1,0.3,1) 0s",
          }}
        >
          <ReportMockup activeMetric={activeMetric} />
        </div>

        {/* ── Desktop cards ── */}
        {CARDS.map((card, i) => {
          const delay = 150 + i * 80;
          return (
            <div
              key={card.id}
              className="absolute z-10 hidden md:block"
              style={{
                ...card.pos,
                width: "22%",
                maxWidth: "255px",
                opacity: cardsVisible ? 1 : 0,
                transform: cardsVisible
                  ? "translate(0,0)"
                  : `translate(${card.from.x}px,${card.from.y}px)`,
                transition: cardsVisible
                  ? `opacity 0.5s ease ${delay}ms, transform 0.65s cubic-bezier(0.16,1,0.3,1) ${delay}ms`
                  : "none",
              }}
            >
              <ShowcaseCard card={card} />
            </div>
          );
        })}

        {/* ── Mobile layout ── */}
        <div className="md:hidden absolute inset-0 flex flex-col items-center justify-center gap-5 px-4 z-10 py-16 overflow-hidden">
          <div
            style={{
              opacity: reportVisible ? 1 : 0,
              transform: `scale(${reportVisible ? 0.88 : 0.82})`,
              transition: "opacity 0.8s ease, transform 0.8s cubic-bezier(0.16,1,0.3,1)",
              transformOrigin: "top center",
            }}
          >
            <ReportMockup activeMetric={activeMetric} />
          </div>
          <div className="grid grid-cols-2 gap-2.5 w-full max-w-sm">
            {CARDS.map((card, i) => (
              <div
                key={card.id}
                style={{
                  opacity: cardsVisible ? 1 : 0,
                  transform: cardsVisible ? "translateY(0)" : "translateY(10px)",
                  transition: cardsVisible
                    ? `opacity 0.5s ease ${i * 80}ms, transform 0.55s cubic-bezier(0.16,1,0.3,1) ${i * 80}ms`
                    : "none",
                }}
              >
                <ShowcaseCard card={card} compact />
              </div>
            ))}
          </div>
        </div>

        {/* ── Scroll hint ── */}
        <div
          className="absolute bottom-7 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
          style={{ opacity: cardsVisible ? 1 : 0, transition: "opacity 0.5s ease 0.6s" }}
        >
          <span className="text-[10px] text-slate-700 tracking-widest uppercase font-mono">scroll to see how</span>
          <svg className="w-4 h-4 text-slate-700 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </section>
  );
}

function ReportMockup({ activeMetric }: { activeMetric: number }) {
  return (
    <div
      style={{
        width: "256px",
        background: "rgba(5,10,24,0.97)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow:
          "0 0 0 1px rgba(99,102,241,0.07), 0 28px 80px rgba(0,0,0,0.65), 0 0 80px rgba(99,102,241,0.05)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(255,255,255,0.015)",
        }}
      >
        <div
          style={{
            width: "18px", height: "18px",
            background: "linear-gradient(135deg, #2563eb, #6366f1)",
            borderRadius: "5px",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
        </div>
        <span style={{ fontSize: "11px", fontWeight: 600, color: "#e2e8f0" }}>Gitwise Report</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "9px",
            color: "#34d399",
            background: "rgba(16,185,129,0.1)",
            border: "1px solid rgba(16,185,129,0.2)",
            borderRadius: "100px",
            padding: "2px 8px",
            fontWeight: 600,
          }}
        >
          Complete
        </span>
      </div>

      {/* Repo */}
      <div style={{ padding: "9px 14px 0", fontFamily: "monospace", fontSize: "9px", color: "#475569", letterSpacing: "0.03em" }}>
        axios/axios · analyzed just now
      </div>

      {/* Metrics */}
      <div style={{ padding: "8px 14px 10px", display: "flex", flexDirection: "column", gap: "3px" }}>
        {METRICS.map((m, i) => (
          <div
            key={m.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "5px 8px",
              borderRadius: "7px",
              background: activeMetric === i ? "rgba(255,255,255,0.04)" : "transparent",
              border: `1px solid ${activeMetric === i ? m.color + "20" : "transparent"}`,
              transition: "background 0.45s ease, border-color 0.45s ease",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                color: activeMetric === i ? "#94a3b8" : "#334155",
                transition: "color 0.45s ease",
              }}
            >
              {m.label}
            </span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: activeMetric === i ? m.color : "#3f4f63",
                fontFamily: "monospace",
                transition: "color 0.45s ease",
              }}
            >
              {m.value}
            </span>
          </div>
        ))}
      </div>

      {/* Quality bar */}
      <div style={{ margin: "0 14px 12px" }}>
        <div style={{ height: "3px", background: "rgba(255,255,255,0.05)", borderRadius: "100px" }}>
          <div
            style={{
              width: "89%",
              height: "100%",
              background: "linear-gradient(90deg, #4f46e5, #a5b4fc)",
              borderRadius: "100px",
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          padding: "7px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "9px", color: "#2d3a4a" }}>187 files · 24k lines</span>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "9px", color: "#2d3a4a" }}>JSON export</span>
          <svg width="10" height="10" fill="none" stroke="#3f4f63" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function ShowcaseCard({
  card,
  compact = false,
}: {
  card: (typeof CARDS)[0];
  compact?: boolean;
}) {
  return (
    <div
      style={{
        background: "rgba(5,10,24,0.92)",
        border: `1px solid ${card.border}`,
        borderRadius: "14px",
        padding: compact ? "11px 12px" : "15px 18px",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: compact ? "0" : "9px" }}>
        <div
          style={{
            width: "26px",
            height: "26px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: card.bg,
            border: `1px solid ${card.border}`,
            color: card.color,
            flexShrink: 0,
          }}
        >
          <svg width="13" height="13" fill="none" stroke={card.color} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={card.icon} />
          </svg>
        </div>
        <div>
          <span
            style={{
              fontSize: "9px",
              fontFamily: "monospace",
              fontWeight: 700,
              color: card.color,
              letterSpacing: "0.1em",
              display: "block",
              lineHeight: 1,
              opacity: 0.8,
            }}
          >
            {card.num}
          </span>
          <span
            style={{
              fontSize: compact ? "11px" : "12px",
              fontWeight: 700,
              color: "#f1f5f9",
              display: "block",
              lineHeight: 1.25,
            }}
          >
            {card.title}
          </span>
        </div>
      </div>
      {!compact && (
        <p style={{ fontSize: "11px", color: "#4a5568", lineHeight: 1.6, margin: 0 }}>
          {card.desc}
        </p>
      )}
    </div>
  );
}
