import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

const THRESHOLD = 70;
const MAX = 110;

export function PullToRefresh({ children }: { children: ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const active = useRef(false);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      // only when at the very top of the page
      if (window.scrollY > 2) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
      active.current = true;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!active.current || startY.current == null || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setPull(0);
        return;
      }
      // resistance curve
      const eased = Math.min(MAX, Math.pow(dy, 0.85));
      setPull(eased);
      if (dy > 6 && window.scrollY <= 0) {
        // prevent rubber-banding the whole page while pulling
        if (e.cancelable) e.preventDefault();
      }
    };
    const onTouchEnd = async () => {
      if (!active.current) return;
      active.current = false;
      const shouldRefresh = pull >= THRESHOLD;
      if (shouldRefresh) {
        setPull(56);
        setRefreshing(true);
        try {
          await Promise.all([
            router.invalidate(),
            qc.invalidateQueries(),
          ]);
        } catch {}
        setRefreshing(false);
      }
      setPull(0);
      startY.current = null;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [pull, refreshing, router, qc]);

  const progress = Math.min(1, pull / THRESHOLD);
  const visible = pull > 0 || refreshing;

  return (
    <>
      <div
        aria-hidden={!visible}
        className="pointer-events-none fixed inset-x-0 z-40 flex justify-center"
        style={{
          top: "calc(env(safe-area-inset-top) + 8px)",
          transform: `translateY(${visible ? Math.min(pull, MAX) * 0.4 : -20}px)`,
          opacity: visible ? 1 : 0,
          transition: active.current ? "none" : "transform 220ms ease, opacity 220ms ease",
        }}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/85 shadow-lg backdrop-blur"
          style={{ transform: `scale(${0.7 + progress * 0.3})` }}
        >
          <Loader2
            className={`h-5 w-5 text-foreground ${refreshing ? "animate-spin" : ""}`}
            style={{ transform: refreshing ? undefined : `rotate(${progress * 270}deg)` }}
          />
        </div>
      </div>
      <div
        style={{
          transform: `translateY(${visible ? Math.min(pull, MAX) * 0.5 : 0}px)`,
          transition: active.current ? "none" : "transform 240ms cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {children}
      </div>
    </>
  );
}
