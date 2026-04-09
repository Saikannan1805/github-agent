import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitHub Repo Analyzer",
  description:
    "AI-powered GitHub repository analysis: architecture, security, code quality, and RAG-powered chat.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-sky-500 flex items-center justify-center text-white font-bold text-sm">
              G
            </div>
            <span className="font-semibold text-slate-100 tracking-tight">
              GitHub Repo Analyzer
            </span>
            <span className="text-xs text-slate-500 ml-1 hidden sm:block">
               AI-powered codebase intelligence
            </span>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
        <footer className="border-t border-slate-800 mt-16 py-6 text-center text-xs text-slate-600">
          Powered by LangGraph · Groq · Supabase pgvector · Next.js
        </footer>
      </body>
    </html>
  );
}
