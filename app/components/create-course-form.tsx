"use client";

import { useActionState } from "react";
import { createCourseAction, type FormActionState } from "../actions";
import { ArrowFillButton } from "./obsidian/arrow-fill-button";

const initialState: FormActionState = { error: null };

export function CreateCourseForm() {
  const [state, formAction, pending] = useActionState(createCourseAction, initialState);
  return <form action={formAction} className="form-stack">
    <div className="form-field"><label htmlFor="course-name">Nombre del curso</label><input id="course-name" name="name" required minLength={3} placeholder="Sociología I"/></div>
    <div className="form-field"><label htmlFor="course-description">Descripción</label><textarea id="course-description" name="description" required minLength={10} placeholder="Qué se trabaja, para quién y con qué propósito."/><span className="field-help">Esta descripción orienta a los estudiantes cuando entran al curso.</span></div>
    {state.error && <div className="form-error" role="alert">{state.error}</div>}
    <ArrowFillButton className="full" type="submit" disabled={pending}>{pending ? "Creando curso…" : "Crear curso"}</ArrowFillButton>
  </form>;
}
