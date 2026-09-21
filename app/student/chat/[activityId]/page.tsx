import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStudent } from "@/src/lib/auth";
import { db } from "@/src/lib/db";
import { ChatComposer } from "./composer";

export default async function ChatPage({params}:{params:Promise<{activityId:string}>}){
  const {activityId}=await params; const user=await requireStudent();
  const activity=await db.activity.findUnique({where:{id:activityId},include:{course:true}}); if(!activity) notFound();
  const enrollment=await db.enrollment.findUnique({where:{courseId_studentId:{courseId:activity.courseId,studentId:user.student.id}}}); if(!enrollment) notFound();
  const conversation=await db.conversation.findFirst({where:{activityId,studentId:user.student.id,status:"ACTIVE"},include:{messages:{orderBy:{createdAt:"asc"}}},orderBy:{createdAt:"desc"}});
  const messages=conversation?.messages??[];
  return <div className="shell chat-page"><div className="chat-shell">
    <header className="chat-header"><Link className="back-link" href={`/student/courses/${activity.courseId}`}>← {activity.course.name}</Link><div className="eyebrow">Tutor de actividad</div><h1>{activity.title}</h1><details className="activity-brief" open={!conversation}><summary>Consigna de la actividad</summary><p>{activity.description}</p></details><div className="privacy-compact">Privado para tu docente · se analizan señales agregadas del grupo, no perfiles individuales.</div></header>

    <section className="chat-window" aria-label="Conversación con el tutor"><div className="chat" role="log" aria-live="polite" aria-relevant="additions">{messages.length?messages.map((m,index)=><div id={index===messages.length-1?"latest-message":undefined} key={m.id} className={`message ${m.role==="STUDENT"?"student":"assistant"}`}><span className="sr-only">{m.role==="STUDENT"?"Tu mensaje":"Respuesta del tutor"}: </span>{m.content}</div>):<div className="empty center"><strong>Empezá la conversación</strong><span>Contale qué querés entender, resolver o practicar. El tutor responde usando el contenido académico activo del curso.</span></div>}</div></section>

    <div className="composer-wrap"><div className="composer"><ChatComposer activityId={activityId} needsConsent={!conversation}/></div></div>
  </div></div>;
}
