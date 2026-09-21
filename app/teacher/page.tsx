import Link from "next/link";
import { requireTeacher } from "@/src/lib/auth";
import { db } from "@/src/lib/db";

type CourseStatusType = "neutral" | "evidence" | "open" | "recommendation";

function CourseStatusIcon({ type }: { type: CourseStatusType }) {
  if (type === "evidence") {
    return <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2.25 9.25 5.5 12.5 6.75 9.25 8 8 11.25 6.75 8 3.5 6.75 6.75 5.5 8 2.25Z" stroke="currentColor" strokeLinejoin="round"/><path d="m12.25 10 .55 1.45 1.45.55-1.45.55-.55 1.45-.55-1.45-1.45-.55 1.45-.55.55-1.45Z" stroke="currentColor" strokeLinejoin="round"/></svg>;
  }
  if (type === "open") {
    return <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="5.25" stroke="currentColor"/><path d="M8 5v3.2l2.1 1.3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  }
  if (type === "recommendation") {
    return <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2.75a4.25 4.25 0 0 0-2.5 7.69c.44.32.75.78.75 1.31h3.5c0-.53.31-.99.75-1.31A4.25 4.25 0 0 0 8 2.75Z" stroke="currentColor" strokeLinejoin="round"/><path d="M6.6 13.5h2.8" stroke="currentColor" strokeLinecap="round"/></svg>;
  }
  return <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="5.25" stroke="currentColor"/><path d="M5.5 8h5" stroke="currentColor" strokeLinecap="round"/></svg>;
}

export default async function TeacherHome(){
 const user=await requireTeacher();
 const courses=await db.course.findMany({where:{teacherId:user.teacher.id},include:{_count:{select:{enrollments:true,activities:true}},insights:{where:{evidenceState:"SUFFICIENT"},select:{id:true}},recommendations:{where:{status:"GENERATED"},select:{id:true}},sessions:{where:{status:"OPEN"},select:{id:true,title:true}}},orderBy:{updatedAt:"desc"}});
 return <div className="shell teacher-dashboard">
  <section className="workspace-header compact teacher-dashboard-header"><div className="workspace-head-row teacher-dashboard-head-row"><div className="teacher-dashboard-intro"><div className="eyebrow">Espacio docente</div><h1>Volvé al trabajo</h1><p>Prepará el contexto, observá señales agregadas y decidí qué hacer en la próxima clase.</p></div><div className="header-actions"><Link className={`${courses.length?"btn secondary":"btn"} teacher-create-course`} href="/teacher/courses/new">Crear curso</Link></div></div></section>
  <section className="section first-section teacher-courses-section"><div className="section-title teacher-courses-heading"><div><div className="label">Tus cursos</div><h2>Elegí dónde continuar</h2><p>Las señales que requieren atención aparecen antes que las métricas descriptivas.</p></div></div>
  {courses.length?<div className="grid two teacher-course-grid">{courses.map(c=>{const open=c.sessions.length;const newRecommendations=c.recommendations.length;const patterns=c.insights.length;const status:{label:string;tone:string;icon:CourseStatusType}=open?{label:open===1?"Clase abierta":`${open} clases abiertas`,tone:"ok",icon:"open"}:newRecommendations?{label:`${newRecommendations} recomendación${newRecommendations===1?"":"es"} nueva${newRecommendations===1?"":"s"}`,tone:"warn",icon:"recommendation"}:patterns?{label:`${patterns} patrón${patterns===1?"":"es"} con evidencia`,tone:"evidence",icon:"evidence"}:{label:"Sin señales nuevas",tone:"neutral",icon:"neutral"};return <Link href={`/teacher/courses/${c.id}?view=summary`} className={`card course-card interactive teacher-course-card${status.icon==="evidence"?" has-evidence":""}`} key={c.id}><div className="teacher-course-card-header"><h3>{c.name}</h3><span className={`badge teacher-status-badge ${status.tone}`}><CourseStatusIcon type={status.icon}/><span>{status.label}</span></span></div><p className="teacher-course-description">{c.description}</p><div className="teacher-course-divider" aria-hidden="true"/><div className="course-card-footer teacher-course-meta"><span><strong>{c._count.enrollments}</strong> estudiantes</span><span><strong>{c._count.activities}</strong> actividades</span><span>Actualizado {c.updatedAt.toLocaleDateString("es-AR")}</span></div><span className="teacher-course-cta">Abrir workspace <span className="teacher-course-cta-arrow" aria-hidden="true">→</span></span></Link>})}</div>:<div className="empty center"><strong>Creá tu primer curso</strong><span>Después vas a poder agregar contenido validado, crear actividades y abrir clases.</span><div className="empty-action"><Link className="btn" href="/teacher/courses/new">Crear curso</Link></div></div>}
  </section>
  <div className="privacy-compact footer-privacy teacher-dashboard-privacy">Educai muestra patrones agregados. No permite abrir conversaciones privadas ni construir perfiles individuales de estudiantes.</div>
 </div>;
}
