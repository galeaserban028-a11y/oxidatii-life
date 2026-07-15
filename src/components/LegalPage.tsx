import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-foreground/10 bg-background/80 sticky top-0 z-10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link
            to="/"
            className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            ← oxidații
          </Link>
          <div className="flex gap-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <Link
              to="/privacy"
              className="hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              privacy
            </Link>
            <Link
              to="/terms"
              className="hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              termeni
            </Link>
            <Link
              to="/cookies"
              className="hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              cookies
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-display text-3xl uppercase leading-tight">{title}</h1>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          ultima actualizare · {updated}
        </p>
        <article className="legal-prose mt-8 space-y-5 text-sm leading-relaxed text-foreground/90">
          {children}
        </article>
        <p className="mt-12 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Contact: privacy@oxidatii.app
        </p>
      </main>
      <style>{`
        .legal-prose h2 { font-family: var(--font-display, inherit); font-size: 1.15rem; text-transform: uppercase; margin-top: 2rem; margin-bottom: 0.5rem; letter-spacing: -0.01em; }
        .legal-prose h3 { font-weight: 700; margin-top: 1.25rem; margin-bottom: 0.25rem; }
        .legal-prose ul { list-style: disc; padding-left: 1.25rem; }
        .legal-prose li { margin: 0.25rem 0; }
        .legal-prose a { text-decoration: underline; }
      `}</style>
    </div>
  );
}
