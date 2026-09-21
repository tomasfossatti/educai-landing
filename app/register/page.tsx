import Link from "next/link";
import { RegisterForm } from "../components/auth-forms";
import { RectangularTextReveal } from "../components/obsidian/text-reveal";

export default function Register(){
  return <div className="shell"><div className="auth wide"><div className="card stack auth-card">
    <div className="auth-intro"><div className="eyebrow">Crear cuenta</div><RectangularTextReveal>Empezá con tu rol correcto</RectangularTextReveal><p>Elegí estudiante o docente. Esa elección define las herramientas que vas a ver después de ingresar.</p></div>
    <RegisterForm/>
    <div className="auth-foot">Al crear una cuenta confirmás que sos mayor de 18 años. ¿Ya tenés cuenta? <Link className="link" href="/login">Ingresar</Link></div>
  </div></div></div>;
}
