import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStudent } from "@/src/lib/auth";
import { db } from "@/src/lib/db";
import { submitFeedbackAction } from "../../../actions";

const options=[
  {value:1,stars:"★☆☆☆",label:"No me sirvió mucho"},
  {value:2,stars:"★★☆☆",label:"Podría mejorar"},
  {value:3,stars:"★★★☆",label:"Me sirvió"},
  {value:4,stars:"★★★★",label:"Me sirvió mucho"}
];

export default async function FeedbackPage({params}:{params:Promise<{sessionId:string}>}){
  const {sessionId}=await params; const user=await requireStudent();
  const session=await db.classSession.findUnique({where:{id:sessionId},include:{course:true}}); if(!session||session.status!=="CLOSED") notFound();
  const enrollment=await db.enrollment.findUnique({where:{courseId_studentId:{courseId:session.courseId,studentId:user.student.id}}}); if(!enrollment) notFound();
  const existing=await db.classFeedback.findUnique({where:{sessionId_studentId:{sessionId,studentId:user.student.id}}});
  return <div className="shell"><div className="auth wide"><div className="card stack">
    <Link className="back-link" href={`/student/courses/${session.courseId}`}>← {session.course.name}</Link>
    <div className="auth-intro"><div className="eyebrow">Feedback · {session.title}</div><h1>¿Cómo te resultó la clase?</h1><p>Elegí una de cuatro opciones. No hay respuesta neutral: buscamos una señal simple que ayude al docente a mejorar la próxima clase.</p></div>
    <div className="privacy-compact">El docente recibe tu valoración y comentario sin tu identidad.</div>
    {existing&&<div className="notice warning small"><strong>Ya respondiste esta clase.</strong> Si enviás nuevamente, tu respuesta anterior se reemplazará.</div>}
    <form action={submitFeedbackAction}><input type="hidden" name="sessionId" value={session.id}/><div className="rating-grid">{options.map(o=><label className="rating-option" key={o.value}><input type="radio" name="rating" value={o.value} required defaultChecked={existing?.rating===o.value}/><span className="rating-stars" aria-hidden="true">{o.stars}</span><span>{o.label}</span></label>)}</div><label>Comentario <span className="field-help">Opcional · una frase alcanza.</span><textarea name="comment" defaultValue={existing?.comment||""} placeholder="¿Qué funcionó o qué cambiarías?" maxLength={800}/></label><button className="btn" type="submit">{existing?"Actualizar feedback":"Enviar feedback"}</button></form>
  </div></div></div>;
}
