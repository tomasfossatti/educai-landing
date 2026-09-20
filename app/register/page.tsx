import Link from "next/link";
import { registerAction } from "../actions";

export default function Register(){
  return <div className="shell"><div className="auth wide"><div className="card stack">
    <div className="auth-intro"><div className="eyebrow">Crear cuenta</div><h1>¿Cómo vas a usar Educai?</h1><p>Elegí tu rol y completá tus datos. Esta elección define la experiencia inicial de la plataforma.</p></div>
    <form action={registerAction}>
      <div className="role-choice-grid" role="radiogroup" aria-label="Rol en Educai">
        <label className="role-choice"><input type="radio" name="role" value="STUDENT" defaultChecked required/><strong>Soy estudiante</strong><span>Quiero entrar a cursos, trabajar con el tutor y dar feedback.</span></label>
        <label className="role-choice"><input type="radio" name="role" value="TEACHER" required/><strong>Soy docente</strong><span>Quiero crear cursos, cargar contenido y observar patrones agregados.</span></label>
      </div>
      <label>Nombre<input name="name" autoComplete="name" required minLength={2}/></label>
      <label>Email<input name="email" type="email" autoComplete="email" inputMode="email" required/></label>
      <label>Contraseña<input name="password" type="password" autoComplete="new-password" required minLength={8}/><span className="field-help">Mínimo 8 caracteres.</span></label>
      <button className="btn" type="submit">Crear cuenta</button>
    </form>
    <div className="auth-foot">Al crear una cuenta confirmás que sos mayor de 18 años. ¿Ya tenés cuenta? <Link className="link" href="/login">Ingresar</Link></div>
  </div></div></div>;
}
