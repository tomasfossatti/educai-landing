"use client";

import { useActionState } from "react";
import { joinCourseAction, type FormActionState } from "../actions";
import { ArrowFillButton } from "./obsidian/arrow-fill-button";
import { CourseCodeInput } from "./obsidian/course-code-input";

const initialState: FormActionState = { error: null };

export function JoinCourseForm() {
  const [state, formAction, pending] = useActionState(joinCourseAction, initialState);
  return <form action={formAction} className="form-stack join-course-form">
    <div className="form-field">
      <label>Código del curso</label>
      <CourseCodeInput error={Boolean(state.error)}/>
    </div>
    {state.error && <div className="form-error" role="alert">{state.error}</div>}
    <ArrowFillButton type="submit" disabled={pending}>{pending ? "Buscando curso…" : "Unirme al curso"}</ArrowFillButton>
  </form>;
}
