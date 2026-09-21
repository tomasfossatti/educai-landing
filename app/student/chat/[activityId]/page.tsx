import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { notFound } from "next/navigation";
import { requireStudent } from "@/src/lib/auth";
import { db } from "@/src/lib/db";
import { ChatComposer } from "./composer";
import { ChatThread } from "./chat-thread";

function objectiveSummary(description: string) {
  const normalized = description.replace(/\s+/g, " ").trim();
  if (normalized.length <= 180) return normalized;
  return `${normalized.slice(0, 177).trimEnd()}…`;
}

export default async function ChatPage({params}:{params:Promise<{activityId:string}>}){
  const {activityId}=await params; const user=await requireStudent();
  const activity=await db.activity.findUnique({where:{id:activityId},include:{course:true}}); if(!activity) notFound();
  const enrollment=await db.enrollment.findUnique({where:{courseId_studentId:{courseId:activity.courseId,studentId:user.student.id}}}); if(!enrollment) notFound();
  const conversation=await db.conversation.findFirst({where:{activityId,studentId:user.student.id,status:"ACTIVE"},include:{messages:{orderBy:{createdAt:"asc"}}},orderBy:{createdAt:"desc"}});
  const messages=conversation?.messages??[];
  const objective=objectiveSummary(activity.description);
  const hasMoreObjective=objective !== activity.description.replace(/\s+/g, " ").trim();

  return <div className="shell chat-page"><div className="chat-shell tutor-workspace">
    <header className="chat-header tutor-header">
      <Link className="back-link tutor-back-link" href={`/student/courses/${activity.courseId}`}>← {activity.course.name}</Link>
      <h1>{activity.title}</h1>
      <div className="tutor-context-row"><span className="status-text">En progreso</span><span aria-hidden="true">·</span><span>Tutor basado en contenido validado de {activity.course.name}</span></div>
      <div className="objective-summary"><strong>Objetivo</strong><p>{objective}</p>{hasMoreObjective&&<details><summary>Ver consigna completa</summary><p>{activity.description}</p></details>}</div>
      <details className="privacy-disclosure"><summary><LockKeyhole size={15} strokeWidth={1.9} aria-hidden="true"/><span>Conversación privada</span></summary><p><strong>Tu docente no puede leer esta conversación.</strong> Solo recibe patrones agregados de aprendizaje del grupo, sin acceso a este chat ni a un perfil individual.</p></details>
    </header>

    <ChatThread messages={messages.map(message=>({id:message.id,role:message.role,content:message.content}))}/>

    <div className="composer-wrap"><div className="composer"><ChatComposer activityId={activityId} needsConsent={!conversation}/></div></div>
  </div></div>;
}
