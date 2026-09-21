import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStudent } from "@/src/lib/auth";
import { db } from "@/src/lib/db";
import { deleteConversationAction } from "../../../actions";
import { ConfirmSubmitButton } from "../../../components/ui-actions";

type SearchParams = Promise<{ notice?: string }>;

function successNotice(notice?:string){
  if(notice==="feedback-sent") return "Feedback enviado. El docente lo verá de forma anónima junto con las respuestas del grupo.";
  if(notice==="joined") return "Ya estás dentro del curso. Elegí una actividad para empezar.";
  if(notice==="conversation-deleted") return "Conversación borrada de tu historial.";
  return null;
}

export default async function StudentCourse({params,searchParams}:{params:Promise<{courseId:string}>;searchParams:SearchParams}){
  const {courseId}=await params; const query=await searchParams; const user=await requireStudent();
  const enrollment=await db.enrollment.findUnique({where:{courseId_studentId:{courseId,studentId:user.student.id}},include:{course:{include:{activities:true}}}}); if(!enrollment) notFound();
  const [conversations,sessions]=await Promise.all([
    db.conversation.findMany({where:{courseId,studentId:user.student.id,status:"ACTIVE"},include:{activity:true,_count:{select:{messages:true}}},orderBy:{updatedAt:"desc"}}),
    db.classSession.findMany({where:{courseId,status:"CLOSED"},include:{classFeedback:{where:{studentId:user.student.id},select:{id:true}}},orderBy:{endedAt:"desc"}})
  ]);
  const pending=sessions.filter(s=>s.classFeedback.length===0);
  const conversationByActivity=new Map(conversations.filter(c=>c.activityId).map(c=>[c.activityId,c]));
  const latestConversation=conversations.find(c=>c.activityId&&c.activity);
  const firstActivity=enrollment.course.activities[0];
  const primaryActivity=latestConversation?.activity??firstActivity;
  const notice=successNotice(query.notice);

  return <div className="shell">
    <section className="course-header"><Link className="back-link" href="/student">← Mis cursos</Link><div className="course-header-main"><div><div className="eyebrow">Curso</div><h1>{enrollment.course.name}</h1><p>{enrollment.course.description}</p></div></div></section>
    {notice&&<div className="notice success" role="status"><strong>{notice}</strong></div>}

    {(primaryActivity||pending.length>0)&&<section className="section next-step-section"><div className="section-title"><div><div className="label">Ahora</div><h2>Qué hacer a continuación</h2></div></div><div className="priority-grid two">
      {primaryActivity&&<div className="card featured priority-card"><div><span className="badge ok">{latestConversation?"En curso":"Para empezar"}</span><h3>{primaryActivity.title}</h3><p className="muted">{primaryActivity.description}</p></div><Link className="btn" href={`/student/chat/${primaryActivity.id}`}>{latestConversation?"Continuar conversación":"Empezar actividad"}</Link></div>}
      {pending.length>0&&<div className="card priority-card"><div><span className="badge warn">{pending.length} pendiente{pending.length===1?"":"s"}</span><h3>Feedback de clase</h3><p className="muted">Contá cómo te resultó la clase. Tu respuesta es anónima para el docente.</p></div><Link className="btn secondary" href={`/student/feedback/${pending[0].id}`}>Dar feedback</Link></div>}
    </div></section>}

    <section className="section"><div className="section-title"><div><div className="label">Aprendizaje</div><h2>Actividades</h2><p>Cada consigna propone qué trabajar con el tutor usando el contenido académico activo del curso.</p></div></div>
      {enrollment.course.activities.length?<div className="activity-list">{enrollment.course.activities.map(a=>{const conversation=conversationByActivity.get(a.id);return <article className="list-row" key={a.id}><div className="list-row-main"><div className="row-title"><h3>{a.title}</h3>{conversation&&<span className="badge ok">En curso</span>}</div><p>{a.description}</p></div><Link className={conversation?"btn":"btn secondary"} href={`/student/chat/${a.id}`}>{conversation?"Continuar":"Empezar"}</Link></article>})}</div>:<div className="empty"><strong>Todavía no hay actividades</strong><span>El docente todavía no publicó consignas para este curso.</span></div>}
    </section>

    <section id="feedback" className="section"><div className="section-title"><div><div className="label">Después de clase</div><h2>Feedback pendiente</h2><p>La valoración usa cuatro opciones y el comentario es opcional.</p></div></div>
      {pending.length?<div className="activity-list">{pending.map(s=><article className="list-row" key={s.id}><div className="list-row-main"><h3>{s.title}</h3><p>Tu respuesta se muestra sin tu identidad al docente.</p></div><Link className="btn secondary" href={`/student/feedback/${s.id}`}>Dar feedback</Link></article>)}</div>:<div className="empty compact"><strong>Todo al día</strong><span>No tenés feedback pendiente. Cuando finalice una clase nueva, aparecerá acá.</span></div>}
    </section>

    <section className="section"><div className="section-title"><div><div className="label">Historial personal</div><h2>Mis conversaciones</h2><p>Solo vos podés abrir estas conversaciones desde tu cuenta.</p></div></div>
      {conversations.length?<div className="activity-list">{conversations.map(c=><article className="list-row" key={c.id}><div className="list-row-main"><h3>{c.activity?.title||"Conversación"}</h3><p>{c._count.messages} mensajes · actualizada {c.updatedAt.toLocaleDateString("es-AR")}</p></div><div className="row row-actions">{c.activityId&&<Link className="btn secondary" href={`/student/chat/${c.activityId}`}>Continuar</Link>}<form action={deleteConversationAction}><input type="hidden" name="conversationId" value={c.id}/><ConfirmSubmitButton message="¿Borrar esta conversación? Se eliminará tu historial de este chat y la acción no se puede deshacer." className="btn ghost danger-text" pendingLabel="Borrando…">Borrar</ConfirmSubmitButton></form></div></article>)}</div>:<div className="empty compact"><strong>Sin conversaciones todavía</strong><span>Cuando empieces una actividad, tu historial aparecerá acá.</span></div>}
    </section>

    <div className="privacy-compact footer-privacy">Privado para tu docente · Educai usa señales agregadas del grupo y no muestra conversaciones individuales ni perfiles personales de aprendizaje.</div>
  </div>;
}
