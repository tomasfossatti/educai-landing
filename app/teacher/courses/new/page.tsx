import Link from "next/link";
import { requireTeacher } from "@/src/lib/auth";
import { CreateCourseForm } from "../../../components/create-course-form";

export default async function NewCourse(){
  await requireTeacher();
  return <div className="shell"><div className="auth wide"><div className="card stack auth-card">
    <Link className="back-link" href="/teacher">← Mis cursos</Link>
    <div className="auth-intro"><div className="eyebrow">Nuevo curso</div><h1>Creá el espacio de aprendizaje</h1><p>Con nombre y descripción alcanza para empezar. Después agregás materiales, actividades y clases desde el workspace.</p></div>
    <CreateCourseForm/>
  </div></div></div>;
}
