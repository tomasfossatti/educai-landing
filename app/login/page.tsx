import Link from "next/link";
import { loginAction } from "../actions";

export default function Login(){
  return <div className="shell"><div className="auth"><div className="card stack">
    <div className="auth-intro"><div className="eyebrow">Acceso a Educai</div><h1>Ingresar</h1><p>Volvé a tus cursos y continuá desde donde estabas.</p></div>
    <form action={loginAction}>
      <label>Email<input name="email" type="email" autoComplete="email" inputMode="email" required/></label>
      <label>Contraseña<input name="password" type="password" autoComplete="current-password" required minLength={8}/></label>
      <button className="btn" type="submit">Ingresar</button>
    </form>
    <div className="auth-foot">¿No tenés cuenta? <Link className="link" href="/register">Crear cuenta</Link></div>
  </div></div></div>;
}
