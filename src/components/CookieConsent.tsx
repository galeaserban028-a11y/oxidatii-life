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
  const isAppRoute = location.pathname.startsWith("/app");

  useEffect(() => {
    if (!getConsent()) setOpen(true);
  }, []);

  const decide = (v: "all" | "essential") => {
    try {
      localStorage.setItem(KEY, v);
      localStorage.setItem(`${KEY}-at`, new Date().toISOString());
    } catch {}
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Setări cookie-uri"
      className={`fixed inset-x-2 z-[100] mx-auto rounded-2xl border border-foreground/15 bg-background/95 shadow-2xl backdrop-blur ${
        isAppRoute
          ? "top-2 max-w-xl p-3 md:left-1/2 md:right-auto md:-translate-x-1/2"
          : "bottom-2 max-w-2xl p-4 md:inset-x-auto md:left-4 md:right-4"
      }`}
    >
      <div className={isAppRoute ? "flex items-center gap-3" : "flex flex-col gap-3"}>
        <div>
          <div className="font-display text-base uppercase leading-tight">
            🍪 cookies pe oxidații
          </div>
          <p className={`${isAppRoute ? "hidden sm:block" : ""} mt-1 text-xs leading-relaxed text-muted-foreground`}>
            Folosim cookie-uri esențiale pentru autentificare și funcționarea aplicației.
            Cu acordul tău, le folosim și pe cele opționale pentru analiză și
            îmbunătățirea experienței. Vezi{" "}
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
