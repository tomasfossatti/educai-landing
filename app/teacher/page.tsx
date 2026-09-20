import Link from "next/link";
import { requireTeacher } from "@/src/lib/auth";
import { db } from "@/src/lib/db";

export default async function TeacherHome(){
 const user=await requireTeacher();
 const courses=await db.course.findMany({where:{teacherId:user.teacher.id},include:{_count:{select:{enrollments:true,activities:true,conversations:true}},insights:{where:{evidenceState:"SUFFICIENT"},select:{id:true}}},orderBy:{updatedAt:"desc"}});
 return <div className="shell">
  <section className="workspace-header compact"><div className="workspace-head-row"><div><div className="eyebrow">Espacio docente</div><h1>Tus cursos</h1><p>Prepará el contexto, observá señales del grupo y decidí qué hacer en la próxima clase.</p></div><div className="header-actions"><Link className="btn" href="/teacher/courses/new">Crear curso</Link></div></div><div className="privacy-compact">Educai muestra patrones agregados. No permite abrir conversaciones privadas ni perfiles individuales de estudiantes.</div></section>
  <section className="section"><div className="section-title"><div><div className="label">Cursos</div><h2>Volver al trabajo</h2><p>Abrí un curso para revisar contenido, actividades, evidencia, recomendaciones y feedback.</p></div></div>
  {courses.length?<div className="grid two">{courses.map(c=><Link href={`/teacher/courses/${c.id}`} className="card course-card interactive" key={c.id}><div className="spread"><div><h3>{c.name}</h3><p className="muted">{c.description}</p></div><span className={`badge ${c.insights.length?"ok":"gray"}`}>{c.insights.length?`${c.insights.length} patrón${c.insights.length===1?"":"es"} con evidencia`:"Sin patrones suficientes"}</span></div><div className="course-card-footer"><span><strong>{c._count.enrollments}</strong> estudiantes</span><span><strong>{c._count.activities}</strong> actividades</span><span><strong>{c._count.conversations}</strong> conversaciones</span></div></Link>)}</div>:<div className="empty center"><strong>Creá tu primer curso</strong><span>Agregá contenido validado y una actividad para empezar a trabajar con estudiantes.</span></div>}
  </section>
 </div>;
}
