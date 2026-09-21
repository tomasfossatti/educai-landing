"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/src/lib/utils";

export function DottedGrid({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = { x: -9999, y: -9999, active: false };
    let raf = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let last = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const move = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
    };
    const leave = () => { pointer.active = false; };

    const draw = (time: number) => {
      if (!reduce && time - last < 30) { raf = requestAnimationFrame(draw); return; }
      last = time;
      ctx.clearRect(0, 0, width, height);
      const spacing = width < 640 ? 28 : 32;
      const phase = reduce ? 0 : time * .00035;
      for (let y = spacing / 2; y < height; y += spacing) {
        for (let x = spacing / 2; x < width; x += spacing) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const influence = pointer.active ? Math.max(0, 1 - distance / 230) : 0;
          const pulse = .5 + .5 * Math.sin(phase * 5 + x * .014 + y * .011);
          const radius = 1.1 + influence * 2.2 + pulse * .18;
          const alpha = .12 + influence * .52 + pulse * .025;
          ctx.beginPath();
          ctx.fillStyle = `rgba(${92 + Math.round(influence * 45)}, ${125 + Math.round(influence * 55)}, 250, ${alpha})`;
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerleave", leave);
    if (reduce) draw(0); else raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerleave", leave);
    };
  }, []);

  return <canvas ref={ref} className={cn("obsidian-dotted-grid", className)} aria-hidden="true" />;
}
