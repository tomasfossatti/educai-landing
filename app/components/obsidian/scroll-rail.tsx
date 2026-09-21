"use client";

import { motion, useScroll, useTransform, type MotionValue } from "motion/react";

const BARS = 24;

function RailBar({ index, progress }: { index: number; progress: MotionValue<number> }) {
  const position = index / (BARS - 1);
  const before = Math.max(0, position - .11);
  const after = Math.min(1, position + .11);
  const opacity = useTransform(progress, [0, before, position, after, 1], [.12, .18, .95, .18, .12]);
  const width = useTransform(progress, [before, position, after], [8, 22, 8]);
  return <motion.span style={{ opacity, width }} />;
}

export function GlowingScrollRail() {
  const { scrollYProgress } = useScroll();
  return <div className="obsidian-scroll-rail" aria-hidden="true">
    {Array.from({ length: BARS }, (_, index) => <RailBar key={index} index={index} progress={scrollYProgress}/>) }
  </div>;
}
