"use client";

import { useActionState } from "react";
import { joinCourseAction, type FormActionState } from "../actions";

const initialState: FormActionState = { error: null };

export function JoinCourseForm() {
  const [state, formAction, pending] = useActionState(joinCourseAction, initialState);
  return <form action={formAction} className="form-stack">
    <div className="form-field">
      <label htmlFor="join-code">Código del curso</label>
      <input id="join-code" name="joinCode" placeholder="A1B2C3D4" autoCapitalize="characters" autoComplete="off" spellCheck={false} required aria-invalid={Boolean(state.error)}/>
      <span className="field-help">Podés copiarlo tal como te lo compartió tu docente.</span>
    </div>
    {state.error && <div className="form-error" role="alert">{state.error}</div>}
    <button className="btn" type="submit" disabled={pending} aria-disabled={pending}>{pending ? "Buscando curso…" : "Unirme al curso"}</button>
  </form>;
}
