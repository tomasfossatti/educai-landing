"use client";

import { useEffect, useRef, useState } from "react";
import { MarkdownMessage } from "../../../components/markdown-message";

type ChatMessage = { id: string; role: string; content: string };

export function ChatThread({ messages }: { messages: ChatMessage[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  const [awayFromBottom, setAwayFromBottom] = useState(false);

  const updatePosition = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const distance = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    setAwayFromBottom(distance > 120);
  };

  const goToLatest = (behavior: ScrollBehavior = "smooth") => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
    setAwayFromBottom(false);
  };

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      requestAnimationFrame(() => goToLatest("auto"));
      return;
    }
    if (!awayFromBottom) requestAnimationFrame(() => goToLatest("smooth"));
  }, [messages.length]);

  return <div ref={viewportRef} className="chat-window chat-scroll" onScroll={updatePosition}>
    <div className="chat" role="log" aria-live="polite" aria-relevant="additions">
      {messages.length ? messages.map((message, index) => {
        const student = message.role === "STUDENT";
        return <div key={message.id} id={index === messages.length - 1 ? "latest-message" : undefined} className={`message-row ${student ? "student-row" : "assistant-row"}`}>
          <div className="message-speaker">{student ? "Vos" : "Tutor Educai"}</div>
          <div className={`message ${student ? "student" : "assistant"}`}>
            {student ? <p className="student-message-text">{message.content}</p> : <MarkdownMessage content={message.content}/>}          
          </div>
        </div>;
      }) : <div className="chat-empty"><strong>Empezá por lo que te genera duda</strong><p>Podés explicar qué entendés hasta ahora, plantear un ejemplo o pedir una pista. El tutor trabaja únicamente con el contenido validado del curso.</p></div>}
    </div>
    {awayFromBottom && <button type="button" className="jump-latest" onClick={() => goToLatest()}>↓ Ir al mensaje más reciente</button>}
  </div>;
}
