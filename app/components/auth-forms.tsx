"use client";

import { useActionState, useState } from "react";
import { loginAction, registerAction, type FormActionState } from "../actions";

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
    <button className="btn" type="submit" disabled={pending} aria-disabled={pending}>{pending ? "Ingresando…" : "Ingresar"}</button>
  </form>;
}

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);
  return <form action={formAction} className="form-stack" noValidate={false}>
    <fieldset className="choice-fieldset">
      <legend>¿Cómo vas a usar Educai?</legend>
      <div className="role-choice-grid">
        <label className="role-choice"><input type="radio" name="role" value="STUDENT" defaultChecked required/><strong>Soy estudiante</strong><span>Quiero entrar a cursos, trabajar con el tutor y dar feedback.</span></label>
        <label className="role-choice"><input type="radio" name="role" value="TEACHER" required/><strong>Soy docente</strong><span>Quiero crear cursos, cargar contenido y observar patrones agregados.</span></label>
      </div>
    </fieldset>
    <div className="form-field"><label htmlFor="register-name">Nombre</label><input id="register-name" name="name" autoComplete="name" required minLength={2}/></div>
    <div className="form-field"><label htmlFor="register-email">Email</label><input id="register-email" name="email" type="email" autoComplete="email" inputMode="email" required/></div>
    <PasswordField id="register-password" name="password" autoComplete="new-password" help="Mínimo 8 caracteres."/>
    {state.error && <div className="form-error" role="alert">{state.error}</div>}
    <button className="btn" type="submit" disabled={pending} aria-disabled={pending}>{pending ? "Creando cuenta…" : "Crear cuenta"}</button>
  </form>;
}
