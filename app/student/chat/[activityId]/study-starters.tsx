"use client";

import { STUDY_STARTERS } from "@/src/lib/study-starters.mjs";

export function StudyStarters({ formId, disabled }: { formId: string; disabled: boolean }) {
  return <section className="study-starters" aria-labelledby="study-starters-title">
    <h2 id="study-starters-title">¿Cómo querés estudiar esto?</h2>
    <div className="study-starter-grid">
      {STUDY_STARTERS.map((starter) => <button
        key={starter.intent}
        type="submit"
        form={formId}
        name="message"
        value={starter.message}
        disabled={disabled}
        className="study-starter"
      >{starter.label}</button>)}
    </div>
  </section>;
}
