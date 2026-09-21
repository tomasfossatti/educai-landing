"use client";

import { DottedGrid } from "./dotted-grid";
import { EducaiSpotlight } from "./spotlight";
import { GlowingScrollRail } from "./scroll-rail";

export function ObsidianExperience({ role }: { role: "TEACHER" | "STUDENT" | null }) {
  return <>
    <div className="obsidian-ambient" aria-hidden="true"><DottedGrid/></div>
    <GlowingScrollRail/>
    <EducaiSpotlight role={role}/>
  </>;
}
