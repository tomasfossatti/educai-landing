"use client";

import { DottedGrid } from "./dotted-grid";

export function ObsidianExperience({ role: _role }: { role: "TEACHER" | "STUDENT" | null }) {
  return <div className="obsidian-ambient" aria-hidden="true"><DottedGrid/></div>;
}
