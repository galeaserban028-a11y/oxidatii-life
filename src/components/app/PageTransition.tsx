import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";
import { memo, ReactNode } from "react";

// GPU-friendly transition: only `opacity` + `transform` (translate3d via `y`)
// are animated, which the compositor can run off the main thread at 60fps.
// No filters/blurs (cause layout/paint), no layout animations, no height/width.
const variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

const transition = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1] as const,
};

// Hint to the browser to promote this layer up-front, so the first frame
// of the animation doesn't pay for a layer-creation hit.
const style = {
  willChange: "opacity, transform",
  // Avoid touching layout of siblings while two pages overlap briefly.
  transform: "translateZ(0)",
} as const;

function PageTransitionImpl({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
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
