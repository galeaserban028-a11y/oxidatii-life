import { motion, AnimatePresence } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";
import { ReactNode } from "react";

// Apple-style spring: snappy in, calm settle. No filter blur on transitions —
// it tanks mobile GPU. Pure transform + opacity keeps 60fps.
const EASE = [0.22, 1, 0.36, 1] as const;

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.24, ease: EASE }}
        style={{ willChange: "transform, opacity", transform: "translateZ(0)" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

