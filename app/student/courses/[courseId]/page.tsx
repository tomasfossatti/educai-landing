import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStudent } from "@/src/lib/auth";
import { db } from "@/src/lib/db";
import { deleteConversationAction } from "../../../actions";
import { ConfirmSubmitButton } from "../../../components/ui-actions";

export default async function StudentCourse({params}:{params:Promise<{courseId:string}>}){
  const {courseId}=await params; const user=await requireStudent();
  const enrollment=await db.enrollment.findUnique({where:{courseId_studentId:{courseId,studentId:user.student.id}},include:{course:{include:{activities:true}}}}); if(!enrollment) notFound();
  const [conversations,sessions]=await Promise.all([
    db.conversation.findMany({where:{courseId,studentId:user.student.id,status:"ACTIVE"},include:{activity:true,_count:{select:{messages:true}}},orderBy:{updatedAt:"desc"}}),
    db.classSession.findMany({where:{courseId,status:"CLOSED"},include:{classFeedback:{where:{studentId:user.student.id},select:{id:true}}},orderBy:{endedAt:"desc"}})
  ]);
  const pending=sessions.filter(s=>s.classFeedback.length===0);
  const conversationByActivity=new Map(conversations.filter(c=>c.activityId).map(c=>[c.activityId,c]));
  return <div className="shell">
    <section className="course-header"><Link className="back-link" href="/student">← Mis cursos</Link><div className="course-header-main"><div><div className="eyebrow">Curso</div><h1>{enrollment.course.name}</h1><p>{enrollment.course.description}</p></div></div>{pending.length>0&&<div className="notice warning"><strong>Tenés {pending.length} feedback{pending.length===1?"":"s"} pendiente{pending.length===1?"":"s"}.</strong> Completarlos lleva menos de un minuto y ayuda al docente a preparar la próxima clase. <a className="link" href="#feedback">Ir al feedback</a></div>}</section>

    <section className="section"><div className="section-title"><div><div className="label">Aprendizaje</div><h2>Actividades</h2><p>Elegí una consigna y trabajala con el tutor usando el contenido validado del curso.</p></div></div>
      {enrollment.course.activities.length?<div className="grid two">{enrollment.course.activities.map(a=>{const conversation=conversationByActivity.get(a.id);return <div className="card" key={a.id}><div className="spread"><div><h3>{a.title}</h3><p className="muted">{a.description}</p></div>{conversation&&<span className="badge ok">En curso</span>}</div><Link className="btn" href={`/student/chat/${a.id}`}>{conversation?"Continuar actividad":"Empezar actividad"}</Link></div>})}</div>:<div className="empty"><strong>Todavía no hay actividades</strong>El docente todavía no publicó consignas para este curso.</div>}
    </section>

    <section id="feedback" className="section"><div className="section-title"><div><div className="label">Después de clase</div><h2>Feedback pendiente</h2><p>Tu respuesta se muestra de forma anónima al docente.</p></div></div>
      {pending.length?<div className="stack">{pending.map(s=><div className="card compact spread" key={s.id}><div><div className="item-title">{s.title}</div><div className="item-meta">1 a 4 estrellas + comentario opcional</div></div><Link className="btn secondary" href={`/student/feedback/${s.id}`}>Dar feedback</Link></div>)}</div>:<div className="empty compact"><strong>Todo al día</strong>No tenés feedback pendiente.</div>}
    </section>

    <section className="section"><div className="section-title"><div><div className="label">Historial personal</div><h2>Mis conversaciones</h2><p>Solo vos podés volver a estas conversaciones desde tu cuenta.</p></div></div>
      {conversations.length?<div className="stack">{conversations.map(c=><div className="card compact spread" key={c.id}><div><div className="item-title">{c.activity?.title||"Conversación"}</div><div className="item-meta">{c._count.messages} mensajes · actualizada {c.updatedAt.toLocaleDateString("es-AR")}</div></div><div className="row">{c.activityId&&<Link className="btn secondary" href={`/student/chat/${c.activityId}`}>Continuar</Link>}<form action={deleteConversationAction}><input type="hidden" name="conversationId" value={c.id}/><ConfirmSubmitButton message="¿Querés borrar esta conversación? Esta acción elimina tu acceso a este historial." className="btn danger">Borrar</ConfirmSubmitButton></form></div></div>)}</div>:<div className="empty compact"><strong>Sin conversaciones todavía</strong>Cuando empieces una actividad, el historial aparecerá acá.</div>}
    </section>
  </div>;
}
