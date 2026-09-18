import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStudent } from "@/src/lib/auth";
import { db } from "@/src/lib/db";
import { deleteConversationAction } from "../../../actions";

export default async function StudentCourse({params}:{params:Promise<{courseId:string}>}){
  const {courseId}=await params; const user=await requireStudent();
  const enrollment=await db.enrollment.findUnique({where:{courseId_studentId:{courseId,studentId:user.student.id}},include:{course:{include:{activities:true}}}}); if(!enrollment) notFound();
  const [conversations,sessions]=await Promise.all([
    db.conversation.findMany({where:{courseId,studentId:user.student.id,status:"ACTIVE"},include:{activity:true,_count:{select:{messages:true}}},orderBy:{updatedAt:"desc"}}),
    db.classSession.findMany({where:{courseId,status:"CLOSED"},include:{classFeedback:{where:{studentId:user.student.id},select:{id:true}}},orderBy:{endedAt:"desc"}})
  ]);
  const pending=sessions.filter(s=>s.classFeedback.length===0);
  return <div className="shell"><section className="hero"><Link className="link" href="/student">← Mis cursos</Link><h1>{enrollment.course.name}</h1><p>{enrollment.course.description}</p></section>
  <section className="section"><div className="section-title"><div><div className="label">Aprendizaje</div><h2>Actividades</h2></div></div>{enrollment.course.activities.length?<div className="grid two">{enrollment.course.activities.map(a=><div className="card" key={a.id}><h3>{a.title}</h3><p className="muted">{a.description}</p><Link className="btn" href={`/student/chat/${a.id}`}>Abrir tutor</Link></div>)}</div>:<div className="empty">El docente todavía no publicó actividades.</div>}</section>
  <section className="section"><div className="section-title"><div><div className="label">Después de clase</div><h2>Feedback pendiente</h2></div></div>{pending.length?<div className="stack">{pending.map(s=><div className="card spread" key={s.id}><div><strong>{s.title}</strong><div className="small muted">Contale al docente cómo te resultó la clase.</div></div><Link className="btn secondary" href={`/student/feedback/${s.id}`}>Dar feedback</Link></div>)}</div>:<div className="empty">No tenés feedback pendiente.</div>}</section>
  <section className="section"><div className="section-title"><div><div className="label">Control personal</div><h2>Mis conversaciones</h2></div></div>{conversations.length?<div className="stack">{conversations.map(c=><div className="card spread" key={c.id}><div><strong>{c.activity?.title||"Conversación"}</strong><div className="small muted">{c._count.messages} mensajes · actualizada {c.updatedAt.toLocaleDateString("es-AR")}</div></div><div className="row">{c.activityId&&<Link className="btn secondary" href={`/student/chat/${c.activityId}`}>Continuar</Link>}<form action={deleteConversationAction}><input type="hidden" name="conversationId" value={c.id}/><button className="btn danger" type="submit">Borrar</button></form></div></div>)}</div>:<div className="empty">Todavía no iniciaste conversaciones en este curso.</div>}</section></div>
}
