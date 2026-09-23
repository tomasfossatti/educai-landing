"use client";

import { useActionState, useRef, useState } from "react";
import { sendMessageAction, type ChatActionState } from "../../../actions";
import { JellyLoader } from "../../../components/obsidian/jelly-loader";
import { StudyStarters } from "./study-starters";

const initialState: ChatActionState = { error: null };

export function ChatComposer({ activityId, showStarters }: { activityId: string; showStarters: boolean }) {
  const [state, formAction, pending] = useActionState(sendMessageAction, initialState);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [canSend, setCanSend] = useState(false);

  const resize = (target: HTMLTextAreaElement) => {
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 144)}px`;
    setCanSend(target.value.trim().length >= 2);
  };

  const formId = `chat-form-${activityId}`;

  return <><form id={formId} action={formAction} className="chat-form">
    <input type="hidden" name="activityId" value={activityId}/>
    <label className="sr-only" htmlFor="chat-message">Tu mensaje</label>
    <span className="sr-only" id="chat-hint">Enter envía el mensaje. Shift más Enter crea una nueva línea.</span>
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
            if(!pending&&event.currentTarget.value.trim().length>=2) event.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <button className="composer-send" type="submit" disabled={pending||!canSend} aria-label={pending?"El tutor está pensando":"Enviar mensaje"}>{pending?"…":"↑"}</button>
    </div>

    {state.error && <div id="chat-error" className="form-error" role="alert">{state.error}</div>}

    {pending&&<div className="composer-meta" aria-live="polite"><span className="composer-thinking"><JellyLoader compact/>Pensando…</span></div>}
  </form>{showStarters && <StudyStarters formId={formId} disabled={pending}/>}</>;
}
