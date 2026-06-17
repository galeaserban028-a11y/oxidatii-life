import { motion, AnimatePresence } from "framer-motion";
import { useRouterState, useNavigate } from "@tanstack/react-router";
import { ReactNode, useRef, useEffect, useState, useCallback, useMemo } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

const TAB_ORDER = [
  "/app",
  "/app/map",
  "/app/top",
  "/app/scan",
  "/app/squad",
  "/app/inbox",
  "/app/me",
] as const;

function getTabIndex(path: string) {
  const exact = TAB_ORDER.indexOf(path as any);
  if (exact !== -1) return exact;
  return TAB_ORDER.findIndex((tab) => path.startsWith(tab + "/"));
}

// Detect low-power Android once to ship a lighter transition there.
function detectLightweight() {
  if (typeof window === "undefined") return false;
  const nav: any = window.navigator;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const lowMem = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4;
  const lowCpu = typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4;
  const isAndroid = /Android/i.test(nav.userAgent || "");
  return reducedMotion || (isAndroid && (lowMem || lowCpu));
}

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const prevPathnameRef = useRef(pathname);
  const [direction, setDirection] = useState(1);
  const [animating, setAnimating] = useState(false);
  const lightweight = useMemo(detectLightweight, []);

  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    const prev = prevPathnameRef.current;
    if (prev !== pathname) {
      const prevIdx = getTabIndex(prev);
      const currIdx = getTabIndex(pathname);
      if (prevIdx !== -1 && currIdx !== -1) {
        setDirection(currIdx > prevIdx ? 1 : -1);
      } else {
        setDirection(pathname.length < prev.length ? -1 : 1);
      }
      prevPathnameRef.current = pathname;
    }
  }, [pathname]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, time: Date.now() };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const end = e.changedTouches[0];
    const dx = touchStart.current.x - end.clientX;
    const dy = touchStart.current.y - end.clientY;
    const dt = Date.now() - touchStart.current.time;
    touchStart.current = null;

    if (Math.abs(dx) < Math.abs(dy) || Math.abs(dx) < 50 || dt > 400) return;

    const currentIdx = getTabIndex(pathname);
    if (currentIdx === -1) return;

    if (dx > 0) {
      const next = TAB_ORDER[currentIdx + 1];
      if (next) navigate({ to: next as any });
    } else {
      const prev = TAB_ORDER[currentIdx - 1];
      if (prev) navigate({ to: prev as any });
    }
  }, [pathname, navigate]);

  const variants = useMemo(() => {
    if (lightweight) {
      return {
        enter: () => ({ opacity: 0 }),
        center: { opacity: 1 },
        exit: () => ({ opacity: 0 }),
      };
    }
    return {
      enter: (dir: number) => ({ x: dir > 0 ? 24 : -24, opacity: 0 }),
      center: { x: 0, opacity: 1 },
      exit: (dir: number) => ({ x: dir > 0 ? -16 : 16, opacity: 0 }),
    };
  }, [lightweight]);

  const transition = lightweight
    ? { duration: 0.14, ease: EASE }
    : { duration: 0.22, ease: EASE };

  return (
    <div
      className="touch-pan-y relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence mode="popLayout" initial={false} custom={direction} onExitComplete={() => setAnimating(false)}>
        <motion.div
          key={pathname}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={transition}
          onAnimationStart={() => setAnimating(true)}
          onAnimationComplete={() => setAnimating(false)}
          style={{
            // Only flag will-change while a transition is in flight.
            willChange: animating ? "transform, opacity" : "auto",
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
