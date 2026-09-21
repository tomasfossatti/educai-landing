"use client";

import { useActionState, useRef } from "react";
import { sendMessageAction, type ChatActionState } from "../../../actions";
import { JellyLoader } from "../../../components/obsidian/jelly-loader";

const initialState: ChatActionState = { error: null };

export function ChatComposer({ activityId, needsConsent }: { activityId: string; needsConsent: boolean }) {
  const [state, formAction, pending] = useActionState(sendMessageAction, initialState);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = (target: HTMLTextAreaElement) => {
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 160)}px`;
  };

  return <form action={formAction} className="chat-form">
    <input type="hidden" name="activityId" value={activityId}/>
    <label className="sr-only" htmlFor="chat-message">Tu mensaje</label>
    <div className="composer-input-shell">
      <textarea
        ref={textareaRef}
        id="chat-message"
        name="message"
        rows={1}
        required
        minLength={2}
        placeholder="Escribí tu duda o explicá cómo lo estás pensando…"
        aria-invalid={Boolean(state.error)}
        aria-describedby={state.error ? "chat-error" : "chat-hint"}
        onInput={(event)=>resize(event.currentTarget)}
        onKeyDown={(event)=>{
          if(event.key==="Enter"&&!event.shiftKey&&!event.nativeEvent.isComposing){
            event.preventDefault();
            if(!pending) event.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <button className="composer-send" type="submit" disabled={pending} aria-label={pending?"El tutor está pensando":"Enviar mensaje"}>{pending?"…":"↑"}</button>
    </div>

    {needsConsent && <label className="consent-box compact-consent"><input type="checkbox" name="consent" value="yes" required/><span><strong>Entiendo el uso de datos de esta conversación.</strong> Mi docente no puede leer este chat; Educai solo puede producir señales agregadas del grupo.</span></label>}
    {state.error && <div id="chat-error" className="form-error" role="alert">{state.error}</div>}

    <div className="composer-meta" id="chat-hint">
      <span>Enter para enviar · Shift + Enter para nueva línea</span>
      {pending&&<span className="composer-thinking" aria-live="polite"><JellyLoader compact/>Pensando…</span>}
    </div>
  </form>;
}
