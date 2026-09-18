"use client";

import { useFormStatus } from "react-dom";

export function MaterialSubmitButton() {
  const { pending } = useFormStatus();
  return <button className="btn" type="submit" disabled={pending} aria-disabled={pending}>{pending ? "Guardando…" : "Guardar contenido"}</button>;
}
