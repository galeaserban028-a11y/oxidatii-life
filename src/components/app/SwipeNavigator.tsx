import { useEffect, useRef, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

// Same order as the bottom tab bar so swipe matches what the user sees.
const TAB_ORDER = ["/app", "/app/map", "/app/top", "/app/squad", "/app/inbox", "/app/me"];

// Disable on routes where horizontal drag is owned by the page itself.
const DISABLED_PREFIXES = ["/app/map", "/app/scan", "/app/chat/", "/app/photo/"];

function currentTabIndex(pathname: string): number {
  const exact = TAB_ORDER.indexOf(pathname);
  if (exact !== -1) return exact;
  for (let i = TAB_ORDER.length - 1; i >= 0; i--) {
    const t = TAB_ORDER[i];
    if (t !== "/app" && pathname.startsWith(t + "/")) return i;
  }
  return -1;
}

/**
 * Lightweight horizontal-swipe navigator: pointer events only, no drag preview.
 * Triggers a route change when the user swipes left/right far/fast enough.
 * Vertical scrolling always wins — we bail the moment |dy| > |dx|.
 */
export function SwipeNavigator({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const ref = useRef<HTMLDivElement | null>(null);
  const swipeDisabled = DISABLED_PREFIXES.some((d) => pathname === d || pathname.startsWith(d));

  // Re-read latest pathname inside listeners without rebinding them.
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let startT = 0;
    let tracking = false;
    let decided: "h" | "v" | null = null;

    const reset = () => {
      tracking = false;
      decided = null;
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return reset();
      // Honor per-route opt-out at gesture start.
      const p = pathRef.current;
      if (DISABLED_PREFIXES.some((d) => p === d || p.startsWith(d))) return reset();
      // Ignore drags that start on inherently swipable elements.
      const t = e.target as HTMLElement | null;
      if (
        t &&
        t.closest('[data-no-swipe], input, textarea, [contenteditable="true"], [role="slider"]')
      )
        return reset();
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startT = performance.now();
      tracking = true;
      decided = null;
    };

    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (decided === null) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        decided = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      }
      if (decided === "v") reset();
    };

    const onEnd = (e: TouchEvent) => {
      if (!tracking || decided !== "h") return reset();
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const dt = performance.now() - startT;
      reset();
      if (Math.abs(dy) > 60) return;
      const fast = Math.abs(dx) / Math.max(dt, 1) > 0.4; // px/ms
      if (Math.abs(dx) < 60 && !fast) return;

      const p = pathRef.current;
      const idx = currentTabIndex(p);
      if (idx === -1) return;
      const next = dx < 0 ? idx + 1 : idx - 1;
      if (next < 0 || next >= TAB_ORDER.length) return;
      navigate({ to: TAB_ORDER[next] as any });
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", reset, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", reset);
    };
  }, [navigate]);

  return (
    <div ref={ref} className="min-w-0" style={{ touchAction: swipeDisabled ? "auto" : "pan-y" }}>
      {children}
    </div>
  );
}
