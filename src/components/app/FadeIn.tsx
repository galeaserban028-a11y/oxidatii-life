import { motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  y?: number;
  className?: string;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 0.22,
  y = 8,
  className,
}: FadeInProps) {
  const reduced = useReducedMotion();
  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{ willChange: "opacity, transform" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
