import Link from "next/link";
import { LoginForm } from "../components/auth-forms";

export default function Login(){
  return <div className="shell"><div className="auth"><div className="card stack auth-card">
    <div className="auth-intro"><div className="eyebrow">Acceso a Educai</div><h1>Ingresar</h1><p>Volvé a tus cursos y continuá desde donde estabas.</p></div>
    <LoginForm/>
    <div className="auth-foot">¿No tenés cuenta? <Link className="link" href="/register">Crear cuenta</Link></div>
  </div></div></div>;
}
