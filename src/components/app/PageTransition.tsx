import { motion, AnimatePresence } from "framer-motion";
import { useRouterState, useNavigate } from "@tanstack/react-router";
import { ReactNode, useRef, useEffect, useState, useCallback } from "react";

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

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const prevPathnameRef = useRef(pathname);
  const [direction, setDirection] = useState(1);

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

    // must be horizontal, significant distance, and reasonably fast
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

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? "-30%" : "30%",
      opacity: 0,
    }),
  };

  return (
    <div
      className="touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={pathname}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25, ease: EASE }}
          style={{ willChange: "transform, opacity", transform: "translateZ(0)" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
