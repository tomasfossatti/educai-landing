import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStudent } from "@/src/lib/auth";
import { db } from "@/src/lib/db";
import { deleteConversationAction } from "../../../actions";
import { ConfirmSubmitButton } from "../../../components/ui-actions";

type SearchParams = Promise<{ notice?: string }>;

function successNotice(notice?:string){
  if(notice==="feedback-sent") return "Feedback enviado. El docente lo verá de forma anónima junto con las respuestas del grupo.";
  if(notice==="joined") return "Ya estás dentro del curso.";
  if(notice==="conversation-deleted") return "Conversación borrada.";
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
  const hasProgress=conversationByActivity.size>0;
  const notice=successNotice(query.notice);

  return <div className="shell student-course-page">
    <header className="student-course-heading"><Link className="back-link" href="/student">← Mis cursos</Link><h1>{enrollment.course.name}</h1><div className="student-course-meta"><span>{enrollment.course.activities.length} actividad{enrollment.course.activities.length===1?"":"es"}</span>{hasProgress&&<><span aria-hidden="true">·</span><span>En progreso</span></>}</div><p>{enrollment.course.description}</p></header>
    {notice&&<div className="notice success compact-notice" role="status"><strong>{notice}</strong></div>}

    <section className="student-activities-section" aria-labelledby="activities-title"><div className="simple-section-title"><h2 id="activities-title">Actividades</h2></div>
      {enrollment.course.activities.length?<div className="student-activity-list">{enrollment.course.activities.map(activity=>{const conversation=conversationByActivity.get(activity.id);return <article className="student-activity-row" key={activity.id}>
        <Link className="activity-hit-area" href={`/student/chat/${activity.id}`}><span className="sr-only">{conversation?"Continuar":"Empezar"} {activity.title}</span></Link>
        <div className="activity-row-content"><div className="activity-row-heading"><h3>{activity.title}</h3>{conversation&&<span className="status-text">En progreso</span>}</div><div className="activity-meta">{conversation?`${conversation._count.messages} mensajes · Actualizado ${conversation.updatedAt.toLocaleDateString("es-AR")}`:"Sin empezar"}</div><p>{activity.description}</p><span className="text-action">{conversation?"Continuar":"Empezar"} →</span></div>
        {conversation&&<details className="row-menu"><summary aria-label={`Más opciones para ${activity.title}`}>•••</summary><div className="row-menu-popover"><form action={deleteConversationAction}><input type="hidden" name="conversationId" value={conversation.id}/><ConfirmSubmitButton message="¿Borrar esta conversación? Esta acción no se puede deshacer." className="menu-danger" pendingLabel="Borrando…">Borrar conversación</ConfirmSubmitButton></form></div></details>}
      </article>})}</div>:<div className="student-empty-line">El docente todavía no publicó actividades para este curso.</div>}
    </section>

    <section id="feedback" className="student-feedback-section" aria-labelledby="feedback-title"><div className="simple-section-title"><h2 id="feedback-title">Feedback</h2></div>
      {pending.length?<div className="student-feedback-list">{pending.map(session=><article className="student-feedback-row" key={session.id}><div><h3>{session.title}</h3><p>Tu respuesta se presenta sin tu identidad al docente.</p></div><Link className="text-action" href={`/student/feedback/${session.id}`}>Dar feedback →</Link></article>)}</div>:<div className="feedback-ok">✓ Todo al día</div>}
    </section>
  </div>;
}
