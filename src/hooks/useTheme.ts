import { useEffect, useState } from "react";

export type Theme = "dark" | "light";
const KEY = "oxi-theme";

function apply(t: Theme) {
  const root = document.documentElement;
  if (t === "light") root.classList.add("light");
  else root.classList.remove("light");
  root.style.colorScheme = t;
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem(KEY) as Theme) || "dark";
  });

  useEffect(() => {
    apply(theme);
    try { localStorage.setItem(KEY, theme); } catch {}
  }, [theme]);

  return {
    theme,
    setTheme,
    toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
  };
}

// Apply early to avoid flash
export function initThemeEarly() {
  if (typeof window === "undefined") return;
  try {
    const t = (localStorage.getItem(KEY) as Theme) || "dark";
    apply(t);
  } catch {}
}
