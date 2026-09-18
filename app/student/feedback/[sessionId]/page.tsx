import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStudent } from "@/src/lib/auth";
import { db } from "@/src/lib/db";
import { submitFeedbackAction } from "../../../actions";

export default async function FeedbackPage({params,searchParams}:{params:Promise<{sessionId:string}>,searchParams:Promise<{concept?:string}>}){
 const {sessionId}=await params; const {concept:conceptId}=await searchParams; const user=await requireStudent(); if(!conceptId) notFound();
 const session=await db.classSession.findUnique({where:{id:sessionId},include:{course:true}}); if(!session) notFound();
 const enrollment=await db.enrollment.findUnique({where:{courseId_studentId:{courseId:session.courseId,studentId:user.student.id}}}); if(!enrollment) notFound();
 const concept=await db.concept.findFirst({where:{id:conceptId,courseId:session.courseId}}); if(!concept) notFound();
 return <div className="shell"><div className="auth" style={{maxWidth:620}}><div className="card stack"><Link className="link" href={`/student/courses/${session.courseId}`}>← {session.course.name}</Link><div><div className="label">Feedback posterior · {session.title}</div><h1>¿Cómo está “{concept.name}” ahora?</h1><p className="muted">Son tres respuestas cortas. El docente verá resultados agregados, no tu respuesta asociada a tu identidad.</p></div><form action={submitFeedbackAction}><input type="hidden" name="sessionId" value={session.id}/><input type="hidden" name="conceptId" value={concept.id}/><label>Claridad actual<select name="clarity" defaultValue="3"><option value="1">1 · Nada claro</option><option value="2">2 · Poco claro</option><option value="3">3 · Intermedio</option><option value="4">4 · Bastante claro</option><option value="5">5 · Muy claro</option></select></label><label>¿Todavía tenés dudas?<select name="stillDoubt" defaultValue="yes"><option value="yes">Sí</option><option value="no">No</option></select></label><label>Comentario opcional<textarea name="comment" placeholder="¿Qué parte sigue siendo difícil o qué ayudó?"/></label><button className="btn">Enviar feedback</button></form></div></div></div>
}
