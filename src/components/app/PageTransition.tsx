import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";
import { memo, ReactNode, useRef } from "react";
import { usePerfLevel } from "@/hooks/usePerfLevel";

// Top-level tab order used to derive slide direction. Anything not in this list
// uses a neutral fade so deep links / detail pages don't jump sideways.
const TAB_ORDER = ["/app", "/app/map", "/app/top", "/app/squad", "/app/inbox", "/app/me"];

function tabIndex(pathname: string): number {
  // Exact match wins (so /app doesn't always swallow /app/map).
  const exact = TAB_ORDER.indexOf(pathname);
  if (exact !== -1) return exact;
  for (let i = TAB_ORDER.length - 1; i >= 0; i--) {
    const t = TAB_ORDER[i];
    if (t !== "/app" && pathname.startsWith(t + "/")) return i;
  }
  return -1;
}

const transition = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1] as const,
};


const style = {
  willChange: "opacity, transform",
  transform: "translateZ(0)",
} as const;

function PageTransitionImpl({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const prefersReducedMotion = useReducedMotion();
  const prevRef = useRef<string>(pathname);

  // Resolve direction BEFORE updating prev ref so we animate from old → new.
  const prev = prevRef.current;
  const a = tabIndex(prev);
  const b = tabIndex(pathname);
  let dir = 0;
  if (a !== -1 && b !== -1 && a !== b) dir = b > a ? 1 : -1;
  prevRef.current = pathname;

  if (prefersReducedMotion) {
    return <>{children}</>;
  }

  const variants = {
    initial: { opacity: 0, x: dir === 0 ? 0 : dir * 28, y: dir === 0 ? 6 : 0 },
    animate: { opacity: 1, x: 0, y: 0 },
    exit: { opacity: 0, x: dir === 0 ? 0 : dir * -28, y: 0 },
  };

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={transition}
        style={style}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export const PageTransition = memo(PageTransitionImpl);
