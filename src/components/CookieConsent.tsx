import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";

const KEY = "oxi-cookie-consent-v1";

export type ConsentValue = "all" | "essential" | null;

export function getConsent(): ConsentValue {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(KEY);
  return v === "all" || v === "essential" ? v : null;
}

export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  // Hide on /app/* and on auth/onboarding flows — the banner is a fixed bottom
  // sheet that otherwise covers form fields and the primary submit button
  // (and blocks reaching them when the mobile keyboard is open).
  const HIDE_PREFIXES = ["/app", "/onboarding", "/signup", "/login", "/reset-password", "/forgot-password"];
  const isHiddenRoute = HIDE_PREFIXES.some((p) => location.pathname === p || location.pathname.startsWith(p + "/"));

  useEffect(() => {
    if (!getConsent()) setOpen(true);
  }, []);

  const decide = (v: "all" | "essential") => {
    try {
      localStorage.setItem(KEY, v);
      localStorage.setItem(`${KEY}-at`, new Date().toISOString());
    } catch {
      setOpen(false);
      return;
    }
    setOpen(false);
  };

  if (!open || isAppRoute) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Setări cookie-uri"
      className="fixed inset-x-2 bottom-2 z-[100] mx-auto max-w-2xl rounded-2xl border border-foreground/15 bg-background/95 p-4 shadow-2xl backdrop-blur md:inset-x-auto md:left-4 md:right-4"
    >
      <div className="flex flex-col gap-3">
        <div>
          <div className="font-display text-base uppercase leading-tight">
            🍪 cookies pe oxidații
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Folosim cookie-uri esențiale pentru autentificare și funcționarea aplicației. Cu acordul
            tău, le folosim și pe cele opționale pentru analiză și îmbunătățirea experienței. Vezi{" "}
            <Link to="/cookies" className="underline hover:text-foreground">
              politica de cookies
            </Link>
            ,{" "}
            <Link to="/privacy" className="underline hover:text-foreground">
              confidențialitate
            </Link>{" "}
            și{" "}
            <Link to="/terms" className="underline hover:text-foreground">
              termeni
            </Link>
            .
          </p>
        </div>
        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
          <button
            onClick={() => decide("essential")}
            className="rounded-md border border-foreground/20 px-3 py-2 font-mono text-[10px] uppercase tracking-widest hover:bg-foreground/5"
          >
            Doar esențiale
          </button>
          <button
            onClick={() => decide("all")}
            className="rounded-md bg-foreground px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-background hover:opacity-90"
          >
            Accept toate
          </button>
        </div>
      </div>
    </div>
  );
}
