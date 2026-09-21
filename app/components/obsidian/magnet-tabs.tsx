"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { cn } from "@/src/lib/utils";

export function MagnetTabs({
  slug,
  options,
  activeTab,
  onSelect,
  className,
}: {
  slug: string;
  options: string[];
  activeTab: string;
  onSelect: (option: string) => void;
  className?: string;
}) {
  const [hovered, setHovered] = useState<string>();
  return <div className={cn("obsidian-magnet-tabs", className)} role="tablist">
    {options.map((option) => {
      const active = activeTab === option;
      return <button
        type="button"
        role="tab"
        aria-selected={active}
        key={`${slug}-${option}`}
        onMouseEnter={() => setHovered(option)}
        onMouseLeave={() => setHovered(undefined)}
        onFocus={() => setHovered(option)}
        onBlur={() => setHovered(undefined)}
        onClick={() => onSelect(option)}
        className={cn("obsidian-magnet-tab", active && "active")}
      >
        <span>{option}</span>
        {active && <motion.span className="obsidian-magnet-tab__line" layoutId={`${slug}-magnet`} transition={{ duration: .24, type: "spring", bounce: .18 }}/>} 
        {(hovered === option || (!hovered && active)) && <motion.span className="obsidian-magnet-tab__glow" layoutId={`${slug}-glow`} transition={{ duration: .22, type: "spring", bounce: 0 }}/>} 
      </button>;
    })}
  </div>;
}
