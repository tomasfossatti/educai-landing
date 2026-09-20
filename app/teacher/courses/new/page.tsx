import Link from "next/link";
import { requireTeacher } from "@/src/lib/auth";
import { createCourseAction } from "../../../actions";

export default async function NewCourse(){
  await requireTeacher();
  return <div className="shell"><div className="auth wide"><div className="card stack">
    <Link className="back-link" href="/teacher">← Mis cursos</Link>
    <div className="auth-intro"><div className="eyebrow">Nuevo curso</div><h1>Creá el espacio de aprendizaje</h1><p>Definí un nombre y una descripción. Después vas a poder agregar materiales, actividades y abrir clases.</p></div>
    <form action={createCourseAction}>
      <label>Nombre del curso<input name="name" required minLength={3} placeholder="Sociología I"/></label>
      <label>Descripción<textarea name="description" required minLength={10} placeholder="Qué se trabaja, para quién y con qué propósito."/></label>
      <button className="btn" type="submit">Crear curso</button>
    </form>
  </div></div></div>;
}
