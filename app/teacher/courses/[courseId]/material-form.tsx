"use client";

import { useActionState, useState } from "react";
import { createMaterialAction, type FormActionState } from "../../../actions";
import { ArrowFillButton } from "../../../components/obsidian/arrow-fill-button";

const initialState: FormActionState = { error: null };

export function MaterialForm({ courseId }: { courseId: string }) {
  const [state, formAction, pending] = useActionState(createMaterialAction, initialState);
  const [fileName, setFileName] = useState("");

  return <form action={formAction} className="form-stack">
    <input type="hidden" name="courseId" value={courseId}/>
    <div className="form-field"><label htmlFor="material-title">Título</label><input id="material-title" name="title" required minLength={3} placeholder="Unidad 2 · Causalidad"/></div>
    <div className="form-field"><label htmlFor="material-text">Contenido en texto <span className="optional-label">Opcional si adjuntás un archivo</span></label><textarea id="material-text" name="text" placeholder="Pegá contenido directamente o adjuntá un archivo."/></div>
    <div className="form-field">
      <label htmlFor="material-file">Archivo <span className="optional-label">PDF, TXT o Markdown</span></label>
      <input id="material-file" name="file" type="file" accept="application/pdf,text/plain,text/markdown,.md,.txt" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}/>
      {fileName && <div className="file-selection" aria-live="polite"><span>Archivo seleccionado</span><strong>{fileName}</strong></div>}
    </div>
    <div className="form-field"><label htmlFor="material-state">Disponibilidad</label><select id="material-state" name="state" defaultValue="ACTIVE"><option value="ACTIVE">Usar ahora en el tutor</option><option value="DRAFT">Guardar como borrador</option></select><span className="field-help">Solo los materiales activos forman parte del conocimiento académico del tutor.</span></div>
    {state.error && <div className="form-error" role="alert">{state.error}</div>}
    <ArrowFillButton className="full" type="submit" disabled={pending}>{pending ? "Procesando material…" : "Agregar material"}</ArrowFillButton>
  </form>;
}
