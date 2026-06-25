import { useEffect, useState, useCallback } from "react";

const KEY = "oxi:compact-mode";

function read(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) === "1";
}

export function useCompactMode() {
  const [compact, setCompact] = useState<boolean>(() => read());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setCompact(read());
    };
    const onCustom = () => setCompact(read());
    window.addEventListener("storage", onStorage);
    window.addEventListener("oxi:compact-change", onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("oxi:compact-change", onCustom as EventListener);
    };
  }, []);

  const toggle = useCallback(() => {
    const next = !read();
    window.localStorage.setItem(KEY, next ? "1" : "0");
    window.dispatchEvent(new Event("oxi:compact-change"));
    setCompact(next);
  }, []);

  return { compact, toggle };
}
