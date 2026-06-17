import { useEffect, useState } from "react";

// App is dark-first nightlife branding. Light mode is intentionally locked off
// because dozens of components use hardcoded dark palette colors that would not
// render correctly in a light theme. Re-enable only after a full token migration.
export type Theme = "dark";

function apply() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("light");
  root.style.colorScheme = "dark";
}

export function useTheme() {
  const [theme] = useState<Theme>("dark");
  useEffect(() => { apply(); }, []);
  return { theme, setTheme: () => {}, toggle: () => {} };
}

export function initThemeEarly() {
  apply();
}
