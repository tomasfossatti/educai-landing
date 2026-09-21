"use client";

import { motion, type Transition } from "motion/react";
import { cn } from "@/src/lib/utils";

export function JellyLoader({ compact = false, className }: { compact?: boolean; className?: string }) {
  const colors = ["#dce7ff", "#b8ccff", "#91afff", "#6e91ff", "#5b7cfa", "#4963dc"];
  const transition: Transition = { duration: 1.5, repeat: Infinity, repeatDelay: .2, ease: "easeOut" };
  const width = compact ? 38 : 72;
  const height = compact ? 26 : 50;
  const offset = compact ? 4 : 7;

  return <div className={cn("obsidian-jelly", compact && "compact", className)} aria-hidden="true">
    {colors.map((color, index) => <motion.span
      key={color}
      style={{ width, height, x: index * offset, y: -index * offset, zIndex: colors.length - index, backgroundColor: color, opacity: 1 - index * .06 }}
      initial={{ scale: 1 }}
      animate={{ scale: [1, .76, 1], rotate: [0, 360] }}
      transition={{ ...transition, delay: index * .05 }}
    />)}
  </div>;
}
