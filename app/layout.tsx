import "./globals.css";
import "./obsidian.css";
import "./obsidian-extras.css";
import Link from "next/link";
import { currentUser } from "@/src/lib/auth";
import { logoutAction } from "./actions";
import { ObsidianExperience } from "./components/obsidian/experience";

export const metadata = { title: "Educai", description: "Evidencia pedagógica agregada a partir de conversaciones de aprendizaje." };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const home = user?.role === "TEACHER" ? "/teacher" : user ? "/student" : "/login";
  const experienceRole = user?.role === "TEACHER" ? "TEACHER" : user?.role === "STUDENT" ? "STUDENT" : null;
  return <html lang="es"><body>
    <ObsidianExperience role={experienceRole}/>
    <a className="skip-link" href="#main-content">Saltar al contenido</a>
    <header className="topbar"><div className="shell topbar-shell">
      <Link className="brand" href={home} aria-label="Educai · Mis cursos"><span className="brand-mark" aria-hidden="true">E</span><span>Educai</span></Link>
      <nav className="nav" aria-label="Navegación principal">
        {user ? <>
          <Link className="nav-link" href={home}>Mis cursos</Link>
          <div className="user-pill"><div className="user-meta"><strong>{user.name}</strong><span>{user.role === "TEACHER" ? "Docente" : "Estudiante"}</span></div><form action={logoutAction}><button className="btn ghost compact" type="submit">Salir</button></form></div>
        </> : <><Link className="nav-link" href="/login">Ingresar</Link><Link className="btn secondary compact" href="/register">Crear cuenta</Link></>}
      </nav>
    </div></header>
    <main id="main-content" className="app-main" tabIndex={-1}>{children}</main>
  </body></html>;
}
