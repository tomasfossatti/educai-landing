import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStudent } from "@/src/lib/auth";
import { db } from "@/src/lib/db";
import { sendMessageAction } from "../../../actions";
import { SubmitButton } from "./submit-button";

export default async function ChatPage({params}:{params:Promise<{activityId:string}>}){
  const {activityId}=await params; const user=await requireStudent();
  const activity=await db.activity.findUnique({where:{id:activityId},include:{course:true}}); if(!activity) notFound();
  const enrollment=await db.enrollment.findUnique({where:{courseId_studentId:{courseId:activity.courseId,studentId:user.student.id}}}); if(!enrollment) notFound();
  const conversation=await db.conversation.findFirst({where:{activityId,studentId:user.student.id,status:"ACTIVE"},include:{messages:{orderBy:{createdAt:"asc"}}},orderBy:{createdAt:"desc"}});
  const messages=conversation?.messages??[];
  return <div className="shell"><div className="chat-shell">
    <header className="chat-header"><Link className="back-link" href={`/student/courses/${activity.courseId}`}>← {activity.course.name}</Link><div className="eyebrow">Tutor de actividad</div><h1>{activity.title}</h1><details className="activity-brief" open={!conversation}><summary>Ver consigna</summary><p>{activity.description}</p></details><div className="privacy-compact">Privado para tu docente · Educai analiza señales agregadas del grupo, no perfiles individuales.</div></header>

    <section className="chat-window" aria-label="Conversación con el tutor"><div className="chat" aria-live="polite">{messages.length?messages.map((m,index)=><div id={index===messages.length-1?"latest-message":undefined} key={m.id} className={`message ${m.role==="STUDENT"?"student":"assistant"}`}>{m.content}</div>):<div className="empty center"><strong>Empezá la conversación</strong>Contale qué querés entender, resolver o practicar. El tutor prioriza el material validado del curso.</div>}</div></section>

    <div className="composer-wrap"><div className="composer"><form action={sendMessageAction}><input type="hidden" name="activityId" value={activityId}/><label>Tu mensaje<textarea name="message" required minLength={2} placeholder="Escribí tu duda o contá cómo estás pensando el problema…"/></label>{!conversation&&<label className="notice small"><span><input type="checkbox" name="consent" value="yes" required/> Entiendo que Educai procesará esta conversación para producir información pedagógica agregada, sin mostrarle al docente mi conversación asociada a mi identidad.</span></label>}<div className="composer-actions"><SubmitButton/></div></form></div></div>
  </div></div>;
}
