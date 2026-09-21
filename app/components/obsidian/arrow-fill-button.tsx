"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/src/lib/utils";
import "./arrow-fill-button.css";

type ObsidianVars = CSSProperties & Record<`--${string}`, string | number>;

type Props = {
  children: ReactNode;
  href?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
  bgColor?: string;
  textColor?: string;
  fillBgColor?: string;
  fillTextColor?: string;
};

export function ArrowFillButton({
  children,
  href,
  type = "button",
  disabled = false,
  className,
  onClick,
  ariaLabel,
  bgColor = "#5b7cfa",
  textColor = "#ffffff",
  fillBgColor = "#f4f7ff",
  fillTextColor = "#14214a",
}: Props) {
  const style: ObsidianVars = {
    "--btn-bg": bgColor,
    "--btn-text": textColor,
    "--btn-fill-bg": fillBgColor,
    "--btn-fill-text": fillTextColor,
    "--btn-fill-bg-hover": "#ffffff",
    "--btn-fill-text-hover": "#111827",
    "--btn-arrow": fillTextColor,
    "--btn-arrow-hover": "#111827",
  };

  const content = <>
    <span className="obsidian-arrow-fill-btn__text">{children}</span>
    <span aria-hidden="true" className="obsidian-arrow-fill-btn__circle">
      <span>{children}</span>
      <span className="obsidian-arrow-fill-btn__circle-text">
        <svg viewBox="0 0 10 10" fill="none" className="obsidian-arrow-fill-btn__icon">
          <path fillRule="evenodd" clipRule="evenodd" d="M0 5.625h7.625l-3.5 3.5L5 10l5-5-5-5-.875.875 3.5 3.5H0v1.25Z" className="obsidian-arrow-fill-btn__path" />
          <path fillRule="evenodd" clipRule="evenodd" d="M0 5.625h7.625l-3.5 3.5L5 10l5-5-5-5-.875.875 3.5 3.5H0v1.25Z" className="obsidian-arrow-fill-btn__path" />
        </svg>
      </span>
    </span>
  </>;

  if (href) {
    return <a href={href} aria-label={ariaLabel} className={cn("obsidian-arrow-fill-btn", className)} style={style}>{content}</a>;
  }

  return <button type={type} disabled={disabled} aria-disabled={disabled || undefined} aria-label={ariaLabel} onClick={onClick} className={cn("obsidian-arrow-fill-btn", className)} style={style}>{content}</button>;
}
