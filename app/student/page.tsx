import Link from "next/link";
import { requireStudent } from "@/src/lib/auth";
import { db } from "@/src/lib/db";
import { joinCourseAction } from "../actions";

export default async function StudentHome(){
  const user=await requireStudent();
  const enrollments=await db.enrollment.findMany({where:{studentId:user.student.id},include:{course:{include:{_count:{select:{activities:true}}}}},orderBy:{joinedAt:"desc"}});
  return <div className="shell">
    <section className="workspace-header compact"><div className="eyebrow">Espacio estudiante</div><h1>¿Qué querés continuar?</h1><p>Entrá a un curso para trabajar actividades con el tutor o sumate a uno nuevo con el código de tu docente.</p><div className="privacy-compact">Tus conversaciones son privadas para el docente. Educai usa señales agregadas para ayudar a mejorar la enseñanza.</div></section>
    <div className="grid two">
      <section><div className="section-title"><div><div className="label">Tus cursos</div><h2>Continuar aprendiendo</h2></div></div>{enrollments.length?<div className="stack">{enrollments.map(({course})=><Link key={course.id} href={`/student/courses/${course.id}`} className="card interactive"><div className="spread"><div><h3>{course.name}</h3><p className="muted small">{course.description}</p></div><span className="badge">{course._count.activities} actividad{course._count.activities===1?"":"es"}</span></div><div className="row small"><span className="link">Abrir curso →</span></div></Link>)}</div>:<div className="empty"><strong>Todavía no tenés cursos</strong>Usá el código de ingreso que te comparta un docente.</div>}</section>
      <section><div className="section-title"><div><div className="label">Nuevo curso</div><h2>Ingresar con código</h2></div></div><div className="card featured"><p className="muted small">El código identifica el curso y te inscribe con tu cuenta actual.</p><form action={joinCourseAction}><label>Código del curso<input name="joinCode" placeholder="A1B2C3D4" autoCapitalize="characters" autoComplete="off" required/></label><button className="btn" type="submit">Unirme al curso</button></form></div></section>
    </div>
  </div>;
}
