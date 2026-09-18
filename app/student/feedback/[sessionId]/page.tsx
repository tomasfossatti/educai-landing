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
  return <div className="shell"><div className="auth" style={{maxWidth:660}}><div className="card stack"><Link className="link" href={`/student/courses/${session.courseId}`}>← {session.course.name}</Link><div><div className="label">Feedback de clase · {session.title}</div><h1>¿Cómo te resultó la clase?</h1><p className="muted">Elegí entre 1 y 4 estrellas. El docente recibe el feedback de forma anónima y puede usarlo para mejorar la próxima clase.</p></div><form action={submitFeedbackAction}><input type="hidden" name="sessionId" value={session.id}/><div className="rating-grid">{options.map(o=><label className="rating-option" key={o.value}><input type="radio" name="rating" value={o.value} required defaultChecked={existing?.rating===o.value}/><span className="rating-stars">{o.stars}</span><span>{o.label}</span></label>)}</div><label>¿Querés contar por qué? <span className="muted small">Opcional</span><textarea name="comment" defaultValue={existing?.comment||""} placeholder="Una frase alcanza." maxLength={800}/></label><button className="btn">{existing?"Actualizar feedback":"Enviar feedback"}</button></form></div></div></div>
}
