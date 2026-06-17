import { useEffect, useState } from "react";

export type Theme = "dark" | "light";
const KEY = "oxi-theme";

function readStored(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark") return v;
  } catch {}
  return "dark";
}

function apply(t: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (t === "light") root.classList.add("light");
  else root.classList.remove("light");
  root.style.colorScheme = t;
}

export function useTheme() {
  // Lazy init so the first render already has the saved preference on the client.
  const [theme, setTheme] = useState<Theme>(readStored);
  const [hydrated, setHydrated] = useState(false);

  // On client mount, re-sync from storage (covers SSR mismatch) but DO NOT write back.
  useEffect(() => {
    const stored = readStored();
    if (stored !== theme) setTheme(stored);
    apply(stored);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After hydration, persist user-initiated changes only.
  useEffect(() => {
    if (!hydrated) return;
    apply(theme);
    try { localStorage.setItem(KEY, theme); } catch {}
  }, [theme, hydrated]);

  return {
    theme,
    setTheme,
    toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
  };
}

// Apply early to avoid flash — called from __root.tsx
export function initThemeEarly() {
  if (typeof window === "undefined") return;
  apply(readStored());
}
