import "./globals.css";
import Link from "next/link";
import { currentUser } from "@/src/lib/auth";
import { logoutAction } from "./actions";

export const metadata = { title: "Educai", description: "Evidencia pedagógica agregada a partir de conversaciones de aprendizaje." };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const home = user?.role === "TEACHER" ? "/teacher" : user ? "/student" : "/login";
  return <html lang="es"><body>
    <header className="topbar"><div className="shell">
      <Link className="brand" href={home} aria-label="Educai · Inicio"><span className="brand-mark" aria-hidden="true">E</span><span>Educai</span></Link>
      <nav className="nav" aria-label="Navegación principal">
        {user ? <><Link className="nav-link" href={home}>Inicio</Link><div className="user-pill"><div className="user-meta"><strong>{user.name}</strong><span>{user.role === "TEACHER" ? "Docente" : "Estudiante"}</span></div><form action={logoutAction}><button className="btn ghost compact" type="submit">Salir</button></form></div></> : <><Link className="nav-link" href="/login">Ingresar</Link><Link className="btn secondary compact" href="/register">Crear cuenta</Link></>}
      </nav>
    </div></header>
    <main className="app-main">{children}</main>
  </body></html>;
}
