import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/src/lib/auth";
import { db } from "@/src/lib/db";

function recommendationLabel(status:string){return status==="GENERATED"?"Nueva":status==="VIEWED"?"Vista":status==="APPLIED"?"Aplicada":status==="DISCARDED"?"Descartada":status}

export default async function InsightDetail({params}:{params:Promise<{courseId:string;insightId:string}>}){
 const {courseId,insightId}=await params; const user=await requireTeacher();
 const insight=await db.aggregatedInsight.findFirst({where:{id:insightId,courseId,course:{teacherId:user.teacher.id}},include:{course:true,concept:true,recommendations:true}}); if(!insight) notFound();
 const evidence=Array.isArray(insight.evidenceJson)?insight.evidenceJson as string[]:[]; const explanations=Array.isArray(insight.explanationJson)?insight.explanationJson as Array<any>:[];
 const sufficient=insight.evidenceState==="SUFFICIENT";
 return <div className="shell">
  <section className="course-header"><Link className="back-link" href={`/teacher/courses/${courseId}`}>← {insight.course.name}</Link><div className="eyebrow">Insight pedagógico</div><h1>{insight.concept.name}</h1><p>{insight.summary}</p><div className="course-meta"><span className={`badge ${sufficient?"ok":"warn"}`}><span className="status-dot"/>{sufficient?"Evidencia suficiente":"Datos insuficientes"}</span></div></section>

  <div className="grid two"><section className="card featured"><div className="label">Alcance observado</div><div className="stat">{Math.round(insight.proportion*100)}%</div><p className="muted">{insight.affectedParticipants} de {insight.totalParticipants} participantes independientes muestran señales relacionadas.</p><div className="meter"><span style={{width:`${Math.min(100,Math.round(insight.proportion*100))}%`}}/></div></section><section className="card"><div className="label">Siguiente decisión</div><h2>Qué podría hacer</h2>{insight.recommendations.length?<div className="stack">{insight.recommendations.map(r=><div className="item-card" key={r.id}><div className="spread"><strong>{r.title}</strong><span className="badge">{recommendationLabel(r.status)}</span></div><p className="small muted">{r.actionText}</p></div>)}</div>:<div className="empty compact"><strong>Sin recomendación todavía</strong>No se genera una acción mientras la evidencia sea insuficiente.</div>}</section></div>

  <section className="section"><div className="section-title"><div><div className="label">Evidencia</div><h2>Ejemplos anonimizados</h2><p>Fragmentos que ayudan a entender la señal sin revelar la identidad del estudiante.</p></div></div>{!sufficient?<div className="notice warning"><strong>La señal todavía es preliminar.</strong> No hay suficiente evidencia para presentarla como un patrón del grupo.</div>:evidence.length?<div className="stack">{evidence.map((e,i)=><div className="evidence" key={i}>“{e}”</div>)}</div>:<div className="empty"><strong>Sin ejemplos guardados</strong>Este insight no tiene snippets disponibles.</div>}</section>

  <section className="section"><div className="section-title"><div><div className="label">Señales explicativas</div><h2>Qué parece estar ayudando</h2><p>Estas asociaciones son observaciones del sistema, no diagnósticos permanentes sobre el grupo.</p></div></div>{explanations.length?<div className="grid two">{explanations.map((e,i)=><div className="card compact" key={i}><div className="item-title">{String(e.type).replaceAll("_"," ").toLowerCase()}</div><div className="item-meta">Señal observada: {String(e.observedSignal).replaceAll("_"," ").toLowerCase()} · {e.count} ocurrencia{e.count===1?"":"s"}</div></div>)}</div>:<div className="empty"><strong>Sin asociación suficiente</strong>Todavía no hay señales observables suficientes para relacionar una forma de explicación con comprensión.</div>}</section>

  <section className="section"><div className="notice"><strong>Feedback de clase:</strong> se analiza por clase completa y de forma anónima. Volvé a “Clases y feedback” para revisar esos resultados.</div></section>
 </div>;
}
