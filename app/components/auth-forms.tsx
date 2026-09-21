"use client";

import { useActionState, useState } from "react";
import { loginAction, registerAction, type FormActionState } from "../actions";
import { ArrowFillButton } from "./obsidian/arrow-fill-button";
import { MagnetTabs } from "./obsidian/magnet-tabs";

const initialState: FormActionState = { error: null };

function PasswordField({ id, name, autoComplete, help }: { id: string; name: string; autoComplete: string; help?: string }) {
  const [visible, setVisible] = useState(false);
  const helpId = help ? `${id}-help` : undefined;
  return <div className="form-field">
    <label htmlFor={id}>Contraseña</label>
    <div className="password-control">
      <input id={id} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} required minLength={8} aria-describedby={helpId}/>
      <button className="field-action" type="button" onClick={() => setVisible((current) => !current)} aria-pressed={visible}>{visible ? "Ocultar" : "Mostrar"}</button>
    </div>
    {help && <span id={helpId} className="field-help">{help}</span>}
  </div>;
}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  return <form action={formAction} className="form-stack" noValidate={false}>
    <div className="form-field"><label htmlFor="login-email">Email</label><input id="login-email" name="email" type="email" autoComplete="email" inputMode="email" required aria-invalid={Boolean(state.error)}/></div>
    <PasswordField id="login-password" name="password" autoComplete="current-password"/>
    {state.error && <div className="form-error" role="alert">{state.error}</div>}
    <ArrowFillButton className="full" type="submit" disabled={pending}>{pending ? "Ingresando…" : "Ingresar"}</ArrowFillButton>
  </form>;
}

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);
  const [role, setRole] = useState<"Estudiante" | "Docente">("Estudiante");
  return <form action={formAction} className="form-stack" noValidate={false}>
    <fieldset className="choice-fieldset">
      <legend>¿Cómo vas a usar Educai?</legend>
      <input type="hidden" name="role" value={role === "Docente" ? "TEACHER" : "STUDENT"}/>
      <MagnetTabs slug="register-role" options={["Estudiante", "Docente"]} activeTab={role} onSelect={(option) => setRole(option as "Estudiante" | "Docente")} />
      <div className="role-explainer" aria-live="polite">{role === "Estudiante" ? "Entrá a cursos, trabajá con el tutor y compartí feedback anónimo." : "Creá cursos, cargá fuentes validadas y observá patrones agregados del grupo."}</div>
    </fieldset>
    <div className="form-field"><label htmlFor="register-name">Nombre</label><input id="register-name" name="name" autoComplete="name" required minLength={2}/></div>
    <div className="form-field"><label htmlFor="register-email">Email</label><input id="register-email" name="email" type="email" autoComplete="email" inputMode="email" required/></div>
    <PasswordField id="register-password" name="password" autoComplete="new-password" help="Mínimo 8 caracteres."/>
    {state.error && <div className="form-error" role="alert">{state.error}</div>}
    <ArrowFillButton className="full" type="submit" disabled={pending}>{pending ? "Creando cuenta…" : "Crear cuenta"}</ArrowFillButton>
  </form>;
}
