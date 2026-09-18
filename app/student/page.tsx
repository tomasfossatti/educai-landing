import Link from "next/link";
import { requireStudent } from "@/src/lib/auth";
import { db } from "@/src/lib/db";
import { joinCourseAction } from "../actions";

export default async function StudentHome(){
  const user=await requireStudent();
  const enrollments=await db.enrollment.findMany({where:{studentId:user.student.id},include:{course:{include:{_count:{select:{activities:true}}}}},orderBy:{joinedAt:"desc"}});
  return <div className="shell"><section className="hero"><div className="label">Espacio estudiante</div><h1>Aprender con contexto, no con respuestas sueltas.</h1><p>Educai usa el material validado por tu docente para acompañarte. Tus conversaciones se procesan para producir información agregada que ayude a mejorar la enseñanza; el docente no puede abrir tu conversación ni ver analytics individuales.</p></section>
  <div className="grid two"><section className="card"><h2>Mis cursos</h2>{enrollments.length? <div className="stack">{enrollments.map(({course})=><Link key={course.id} href={`/student/courses/${course.id}`} className="card"><div className="spread"><div><strong>{course.name}</strong><div className="small muted">{course.description}</div></div><span className="badge">{course._count.activities} actividades</span></div></Link>)}</div>:<div className="empty">Todavía no estás inscripto en ningún curso.</div>}</section>
  <section className="card"><h2>Unirme a un curso</h2><p className="muted">Pedile al docente el código de ingreso.</p><form action={joinCourseAction}><label>Código<input name="joinCode" placeholder="A1B2C3D4" autoCapitalize="characters" required/></label><button className="btn">Unirme</button></form></section></div>
  <div className="footer-note">Privacidad: Educai separa la identidad del estudiante de los datos analíticos que ve el docente. Las evidencias visibles se anonimizan y solo aparecen cuando existe un mínimo de participantes independientes.</div></div>
}
