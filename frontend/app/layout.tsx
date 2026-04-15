import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "Gitwise — AI GitHub Analysis",
  description:
    "Deep AI analysis of any GitHub repository. Architecture, security, code quality, and RAG-powered chat.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#030712] text-slate-100 antialiased">
{/* Ambient background glows — fixed so they stay as you scroll */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
          <div
            className="absolute -top-60 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full"
            style={{
              background:
                "radial-gradient(ellipse, rgba(37,99,235,0.12) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />
          <div
            className="absolute top-1/2 -right-60 w-[600px] h-[600px] rounded-full"
            style={{
              background:
                "radial-gradient(ellipse, rgba(109,40,217,0.08) 0%, transparent 70%)",
              filter: "blur(60px)",
            }}
          />
          <div
            className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full"
            style={{
              background:
                "radial-gradient(ellipse, rgba(16,185,129,0.04) 0%, transparent 70%)",
              filter: "blur(60px)",
            }}
          />
        </div>

        <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
