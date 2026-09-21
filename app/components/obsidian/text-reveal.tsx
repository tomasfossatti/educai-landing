"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/src/lib/utils";

export function RectangularTextReveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return <div className={cn("obsidian-text-reveal", className)}>
    <motion.h1 initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : .28, duration: .12 }}>{children}</motion.h1>
    {!reduce && <motion.span
      aria-hidden="true"
      className="obsidian-text-reveal__bar"
      initial={{ scaleX: 0, transformOrigin: "0% 50%" }}
      animate={{ scaleX: [0, 1, 1, 0], transformOrigin: ["0% 50%", "0% 50%", "100% 50%", "100% 50%"] }}
      transition={{ duration: .82, ease: [0.4, 0, 0.2, 1] }}
    />}
  </div>;
}
