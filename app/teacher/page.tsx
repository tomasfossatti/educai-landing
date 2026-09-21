import Link from "next/link";
import { requireTeacher } from "@/src/lib/auth";
import { db } from "@/src/lib/db";

export default async function TeacherHome(){
 const user=await requireTeacher();
 const courses=await db.course.findMany({where:{teacherId:user.teacher.id},include:{_count:{select:{enrollments:true,activities:true}},insights:{where:{evidenceState:"SUFFICIENT"},select:{id:true}},recommendations:{where:{status:"GENERATED"},select:{id:true}},sessions:{where:{status:"OPEN"},select:{id:true,title:true}}},orderBy:{updatedAt:"desc"}});
 return <div className="shell">
  <section className="workspace-header compact"><div className="workspace-head-row"><div><div className="eyebrow">Espacio docente</div><h1>Volvé al trabajo</h1><p>Prepará el contexto, observá señales agregadas y decidí qué hacer en la próxima clase.</p></div><div className="header-actions"><Link className={courses.length?"btn secondary":"btn"} href="/teacher/courses/new">Crear curso</Link></div></div></section>
  <section className="section first-section"><div className="section-title"><div><div className="label">Tus cursos</div><h2>Elegí dónde continuar</h2><p>Las señales que requieren atención aparecen antes que las métricas descriptivas.</p></div></div>
  {courses.length?<div className="grid two">{courses.map(c=>{const open=c.sessions.length;const newRecommendations=c.recommendations.length;const patterns=c.insights.length;const status=open?{label:open===1?"Clase abierta":`${open} clases abiertas`,tone:"ok"}:newRecommendations?{label:`${newRecommendations} recomendación${newRecommendations===1?"":"es"} nueva${newRecommendations===1?"":"s"}`,tone:"warn"}:patterns?{label:`${patterns} patrón${patterns===1?"":"es"} con evidencia`,tone:""}:{label:"Sin señales nuevas",tone:"gray"};return <Link href={`/teacher/courses/${c.id}?view=summary`} className="card course-card interactive" key={c.id}><div className="spread"><div><h3>{c.name}</h3><p className="muted">{c.description}</p></div><span className={`badge ${status.tone}`}>{status.label}</span></div><div className="course-card-footer"><span><strong>{c._count.enrollments}</strong> estudiantes</span><span><strong>{c._count.activities}</strong> actividades</span><span>Actualizado {c.updatedAt.toLocaleDateString("es-AR")}</span></div><span className="link">Abrir workspace →</span></Link>})}</div>:<div className="empty center"><strong>Creá tu primer curso</strong><span>Después vas a poder agregar contenido validado, crear actividades y abrir clases.</span><div className="empty-action"><Link className="btn" href="/teacher/courses/new">Crear curso</Link></div></div>}
  </section>
  <div className="privacy-compact footer-privacy">Educai muestra patrones agregados. No permite abrir conversaciones privadas ni construir perfiles individuales de estudiantes.</div>
 </div>;
}
