import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";
import { memo, ReactNode } from "react";

// GPU-friendly transition: only `opacity` + `transform` (translate3d via `y`)
// are animated, which the compositor can run off the main thread at 60fps.
// No filters/blurs (cause layout/paint), no layout animations, no height/width.
const variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
};

const transition = {
  duration: 0.14,
  ease: [0.22, 1, 0.36, 1] as const,
};

const style = {
  willChange: "opacity, transform",
  transform: "translateZ(0)",
} as const;

function PageTransitionImpl({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <>{children}</>;
  }

  // `mode="popLayout"` lets the new page mount immediately while the old fades —
  // no perceived blank gap, feels instant on mid-range Android.
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
