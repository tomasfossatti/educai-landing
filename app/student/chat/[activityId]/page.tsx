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
  return <div className="shell"><section className="hero"><Link className="link" href={`/student/courses/${activity.courseId}`}>← {activity.course.name}</Link><h1>{activity.title}</h1><p>{activity.description}</p></section>
  <div className="notice"><strong>Cómo se usa tu conversación</strong><div className="small">Se procesa para detectar dudas y patrones agregados que ayuden al docente a adaptar la clase. El docente no puede abrir esta conversación asociada a tu identidad. Podés borrarla desde tu curso.</div></div>
  <section className="section chat" aria-live="polite">{messages.length?messages.map((m,index)=><div id={index===messages.length-1?"latest-message":undefined} key={m.id} className={`message ${m.role==="STUDENT"?"student":"assistant"}`}>{m.content}</div>):<div className="empty">Empezá con una duda concreta. El tutor va a priorizar el material validado del curso y te dirá cuando no encuentre respaldo suficiente.</div>}</section>
  <div className="card" style={{maxWidth:800}}><form action={sendMessageAction}><input type="hidden" name="activityId" value={activityId}/><label>Tu pregunta<textarea name="message" required minLength={2} placeholder="Ej.: Entiendo la definición, pero no veo la diferencia entre correlación y causalidad. ¿Podés darme un ejemplo?"/></label>{!conversation&&<label className="notice small"><span><input style={{width:"auto",marginRight:8}} type="checkbox" name="consent" value="yes" required/>Entiendo que Educai procesará esta conversación para producir información pedagógica agregada para el docente, sin mostrarle mi conversación asociada a mi identidad.</span></label>}<SubmitButton/></form></div></div>
}
