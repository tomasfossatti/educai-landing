import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/src/lib/auth";
import { db } from "@/src/lib/db";

function recommendationLabel(status:string){return status==="GENERATED"?"Nueva":status==="VIEWED"?"Vista":status==="APPLIED"?"Aplicada":status==="DISCARDED"?"Descartada":"Estado actualizado"}
function explanationLabel(value:unknown){const labels:Record<string,string>={CONCRETE_EXAMPLE:"Ejemplo concreto",ANALOGY:"Analogía",STEP_BY_STEP:"Explicación paso a paso",DEFINITION:"Definición",COMPARISON:"Comparación",APPLIED_CASE:"Caso aplicado",OTHER:"Otra estrategia"};return labels[String(value)]??"Estrategia de explicación"}
function signalLabel(value:unknown){const labels:Record<string,string>={EXPLICIT_CONFIRMATION:"Confirmación explícita",ADVANCED_WITHOUT_REPETITION:"Avanzó sin repetir la duda",REDUCED_CONFUSION:"Menos señales de confusión",FEEDBACK_POSITIVE:"Feedback positivo",NONE:"Sin señal concluyente"};return labels[String(value)]??"Señal observada"}

export default async function InsightDetail({params}:{params:Promise<{courseId:string;insightId:string}>}){
 const {courseId,insightId}=await params; const user=await requireTeacher();
 const insight=await db.aggregatedInsight.findFirst({where:{id:insightId,courseId,course:{teacherId:user.teacher.id}},include:{course:true,concept:true,recommendations:true}}); if(!insight) notFound();
 const evidence=Array.isArray(insight.evidenceJson)?insight.evidenceJson as string[]:[]; const explanations=Array.isArray(insight.explanationJson)?insight.explanationJson as Array<any>:[];
 const sufficient=insight.evidenceState==="SUFFICIENT";
 return <div className="shell">
  <section className="course-header"><Link className="back-link" href={`/teacher/courses/${courseId}?view=insights`}>← Insights de {insight.course.name}</Link><div className="eyebrow">Insight pedagógico</div><h1>{insight.concept.name}</h1><p>{insight.summary}</p><div className="course-meta"><span className={`badge ${sufficient?"ok":"warn"}`}><span className="status-dot"/>{sufficient?"Evidencia suficiente":"Datos insuficientes"}</span></div></section>

  <div className="insight-detail-grid"><section className="card featured"><div className="label">Señal observada</div><div className="stat">{Math.round(insight.proportion*100)}%</div><p className="muted">{insight.affectedParticipants} de {insight.totalParticipants} participantes analizados muestran señales relacionadas con este concepto.</p><div className="meter" aria-label={`${Math.round(insight.proportion*100)} por ciento`}><span style={{width:`${Math.min(100,Math.round(insight.proportion*100))}%`}}/></div></section><section className="card"><div className="label">Siguiente decisión</div><h2>Qué podrías considerar</h2>{insight.recommendations.length?<div className="stack">{insight.recommendations.map(r=><div className="item-card" key={r.id}><div className="spread"><strong>{r.title}</strong><span className="badge">{recommendationLabel(r.status)}</span></div><p className="small muted">{r.actionText}</p></div>)}</div>:<div className="empty compact"><strong>Sin recomendación todavía</strong><span>No se genera una acción mientras la evidencia sea insuficiente.</span></div>}</section></div>

  <section className="section"><div className="section-title"><div><div className="label">Evidencia</div><h2>Ejemplos anonimizados</h2><p>Fragmentos que ayudan a entender la señal sin revelar la identidad del estudiante ni permitir abrir su conversación.</p></div></div>{!sufficient?<div className="notice warning"><strong>La señal todavía es preliminar.</strong><span> No hay evidencia suficiente para presentarla como un patrón del grupo.</span></div>:evidence.length?<div className="stack">{evidence.map((e,i)=><blockquote className="evidence" key={i}>“{e}”</blockquote>)}</div>:<div className="empty"><strong>Sin ejemplos guardados</strong><span>Este insight no tiene fragmentos anonimizados disponibles.</span></div>}</section>

  <section className="section"><div className="section-title"><div><div className="label">Interpretación</div><h2>Qué señales acompañaron la comprensión</h2><p>Son asociaciones observadas por el sistema, no diagnósticos ni estilos de aprendizaje permanentes.</p></div></div>{explanations.length?<div className="grid two">{explanations.map((e,i)=><article className="card compact" key={i}><div className="item-title">{explanationLabel(e.type)}</div><div className="item-meta">{signalLabel(e.observedSignal)} · {e.count} ocurrencia{e.count===1?"":"s"}</div></article>)}</div>:<div className="empty"><strong>Sin asociación suficiente</strong><span>Todavía no hay señales suficientes para relacionar una forma de explicación con comprensión.</span></div>}</section>

  <section className="section"><div className="notice"><strong>Feedback de clase:</strong><span> se analiza por clase completa y de forma anónima. </span><Link className="link" href={`/teacher/courses/${courseId}?view=classes`}>Ver clases y feedback</Link></div></section>
 </div>;
}
