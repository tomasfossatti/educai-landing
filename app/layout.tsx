import "./globals.css";
import Link from "next/link";
import { currentUser } from "@/src/lib/auth";
import { logoutAction } from "./actions";

export const metadata = { title: "Educai", description: "Evidencia pedagógica agregada a partir de conversaciones de aprendizaje." };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return <html lang="es"><body>
    <header className="topbar"><div className="shell"><Link className="brand" href={user?.role === "TEACHER" ? "/teacher" : user ? "/student" : "/login"}>Educai</Link>
      <nav className="nav">{user ? <><span className="small muted">{user.name} · {user.role === "TEACHER" ? "Docente" : "Estudiante"}</span><form action={logoutAction}><button className="btn ghost" type="submit">Salir</button></form></> : <><Link href="/login">Ingresar</Link><Link href="/register">Crear cuenta</Link></>}</nav>
    </div></header>
    <main>{children}</main>
  </body></html>;
}
