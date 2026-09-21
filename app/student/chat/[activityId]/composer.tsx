"use client";

import { useActionState } from "react";
import { sendMessageAction, type ChatActionState } from "../../../actions";
import { ArrowFillButton } from "../../../components/obsidian/arrow-fill-button";
import { JellyLoader } from "../../../components/obsidian/jelly-loader";

const initialState: ChatActionState = { error: null };

export function ChatComposer({ activityId, needsConsent }: { activityId: string; needsConsent: boolean }) {
  const [state, formAction, pending] = useActionState(sendMessageAction, initialState);

  return <form action={formAction} className="chat-form">
    <input type="hidden" name="activityId" value={activityId}/>
    <div className="form-field">
      <label htmlFor="chat-message">Tu mensaje</label>
      <textarea id="chat-message" name="message" required minLength={2} placeholder="Escribí tu duda o contá cómo estás pensando el problema…" aria-invalid={Boolean(state.error)} aria-describedby={state.error ? "chat-error" : "chat-hint"}/>
      <span className="field-help" id="chat-hint">Podés escribir varias líneas. Usá el botón para enviar.</span>
    </div>
    {needsConsent && <label className="consent-box"><input type="checkbox" name="consent" value="yes" required/><span><strong>Entiendo cómo se procesa esta conversación.</strong> Educai puede analizarla para producir señales pedagógicas agregadas, pero el docente no puede abrir este chat ni verlo asociado a mi identidad.</span></label>}
    {state.error && <div id="chat-error" className="form-error" role="alert">{state.error}</div>}
    <div className="composer-actions">
      <div className="ai-state-wrap">{pending && <JellyLoader compact/>}<span className="ai-state" aria-live="polite">{pending ? "El tutor está trabajando con el contenido activo del curso." : "Tutor listo para responder"}</span></div>
      <ArrowFillButton type="submit" disabled={pending} className="compact">{pending ? "Pensando…" : "Enviar al tutor"}</ArrowFillButton>
    </div>
  </form>;
}
