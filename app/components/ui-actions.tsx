"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

export function PendingSubmitButton({
  children,
  pendingLabel = "Guardando…",
  className = "btn",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return <button className={className} type="submit" disabled={pending} aria-disabled={pending}>{pending ? pendingLabel : children}</button>;
}

export function ConfirmSubmitButton({
  children,
  message,
  className = "btn danger",
  pendingLabel = "Procesando…",
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className}
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function CopyTextButton({ value, label = "Copiar" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button className="btn ghost compact" type="button" onClick={copy} aria-label={`${label} código del curso`}>
      <span aria-live="polite">{copied ? "Copiado" : label}</span>
    </button>
  );
}
