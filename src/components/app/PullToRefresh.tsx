import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

// Platform calibration — tuned so both feel identical in hand.
// iOS already rubber-bands the page, so we need stiffer damping + a tiny
// dead-zone before our pull starts, otherwise it feels "double-stretchy".
// Android has no native overscroll bounce, so it needs a softer curve and
// a smaller dead-zone so the gesture catches immediately.
const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
const IS_IOS =
  /iPad|iPhone|iPod/.test(ua) ||
  (/Mac/.test(ua) && "ontouchend" in (globalThis as unknown as Record<string, unknown>));
const TUNING = IS_IOS
  ? { THRESHOLD: 78, MAX: 130, DAMP: 145, DEAD: 8, START_OFFSET: 6 }
  : { THRESHOLD: 64, MAX: 130, DAMP: 95, DEAD: 4, START_OFFSET: 2 };
const { THRESHOLD, MAX, DAMP, DEAD, START_OFFSET } = TUNING;

export function PullToRefresh({ children }: { children: ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const indicatorRef = useRef<HTMLDivElement | null>(null);
  const spinnerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const startY = useRef<number | null>(null);
  const active = useRef(false);
  const pullRef = useRef(0);
  const rafPending = useRef(false);
  const refreshingRef = useRef(false);

  // Apply current pull value to DOM without React re-render.
  const applyTransform = (pull: number, animated: boolean) => {
    const visible = pull > 0 || refreshingRef.current;
    const clamped = Math.min(pull, MAX);
    const progress = Math.min(1, pull / THRESHOLD);

    const ind = indicatorRef.current;
    const spn = spinnerRef.current;
    const ctn = contentRef.current;
    const transition = animated
      ? "transform 280ms cubic-bezier(0.22,1,0.36,1), opacity 220ms ease"
      : "none";

    if (ind) {
      ind.style.transition = transition;
      ind.style.opacity = visible ? "1" : "0";
      ind.style.transform = `translate3d(0, ${visible ? clamped * 0.45 : -24}px, 0)`;
    }
    if (spn) {
      spn.style.transition = animated ? "transform 220ms ease" : "none";
      const scale = 0.65 + progress * 0.35;
      const rot = refreshingRef.current ? 0 : progress * 270;
      spn.style.transform = `scale(${scale}) rotate(${rot}deg)`;
    }
    if (ctn) {
      ctn.style.transition = animated ? "transform 320ms cubic-bezier(0.22,1,0.36,1)" : "none";
      ctn.style.transform = `translate3d(0, ${visible ? clamped * 0.5 : 0}px, 0)`;
    }
  };

  const scheduleApply = () => {
    if (rafPending.current) return;
    rafPending.current = true;
    requestAnimationFrame(() => {
      rafPending.current = false;
      applyTransform(pullRef.current, false);
    });
  };

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current) return;
      const target = e.target as HTMLElement | null;
      if (
        target?.closest("[data-no-pull-refresh], .maplibregl-map, .maplibregl-control-container")
      ) {
        startY.current = null;
        active.current = false;
        return;
      }
      if (window.scrollY > 2) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
      active.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!active.current || startY.current == null || refreshingRef.current) return;
      const raw = e.touches[0].clientY - startY.current;
      // dead-zone — ignore tiny jitters / iOS rubber-band noise
      const dy = raw - DEAD;
      if (dy <= 0) {
        if (pullRef.current !== 0) {
          pullRef.current = 0;
          scheduleApply();
        }
        return;
      }
      // exponential resistance — same shape, platform-tuned damping
      const eased = MAX * (1 - Math.exp(-dy / DAMP));
      pullRef.current = eased;
      if (raw > START_OFFSET && window.scrollY <= 0 && e.cancelable) e.preventDefault();
      scheduleApply();
    };

    const onTouchEnd = async () => {
      if (!active.current) return;
      active.current = false;
      const shouldRefresh = pullRef.current >= THRESHOLD;
      if (shouldRefresh) {
        refreshingRef.current = true;
        setRefreshing(true);
        pullRef.current = 56;
        applyTransform(pullRef.current, true);
        try {
          await Promise.all([router.invalidate(), qc.invalidateQueries()]);
        } catch { /* noop */ }
        refreshingRef.current = false;
        setRefreshing(false);
      }
      pullRef.current = 0;
      startY.current = null;
      applyTransform(0, true);
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
  }, [router, qc]);

  return (
    <>
      <div
        ref={indicatorRef}
        aria-hidden
        className="pointer-events-none fixed inset-x-0 z-40 flex justify-center"
        style={{
          top: "calc(env(safe-area-inset-top) + 8px)",
          opacity: 0,
          transform: "translate3d(0,-24px,0)",
          willChange: "transform, opacity",
        }}
      >
        <div
          ref={spinnerRef}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/85 shadow-lg"
          style={{ willChange: "transform" }}
        >
          <Loader2 className={`h-5 w-5 text-foreground ${refreshing ? "animate-spin" : ""}`} />
        </div>
      </div>
      <div ref={contentRef} style={{ willChange: "transform" }}>
        {children}
      </div>
    </>
  );
}
