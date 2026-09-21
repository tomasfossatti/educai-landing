import Link from "next/link";
import { requireStudent } from "@/src/lib/auth";
import { db } from "@/src/lib/db";
import { JoinCourseForm } from "../components/join-course-form";

export default async function StudentHome(){
  const user=await requireStudent();
  const [enrollments,recentConversation,pendingFeedback]=await Promise.all([
    db.enrollment.findMany({where:{studentId:user.student.id},include:{course:{include:{_count:{select:{activities:true}}}}},orderBy:{joinedAt:"desc"}}),
    db.conversation.findFirst({where:{studentId:user.student.id,status:"ACTIVE",activityId:{not:null}},include:{activity:{include:{course:true}}},orderBy:{updatedAt:"desc"}}),
    db.classSession.findMany({where:{status:"CLOSED",course:{enrollments:{some:{studentId:user.student.id}}},classFeedback:{none:{studentId:user.student.id}}},include:{course:true},orderBy:{endedAt:"desc"},take:3})
  ]);
  const recentActivity=recentConversation?.activity;
  const primaryPending=pendingFeedback[0];

  return <div className="shell">
    <section className="workspace-header compact"><div className="eyebrow">Espacio estudiante</div><h1>Hola, {user.name.split(" ")[0]}</h1><p>Tu próximo paso aparece primero. Después podés explorar el resto de tus cursos o sumarte a uno nuevo.</p></section>

    {(recentActivity||primaryPending)&&<section className="priority-area" aria-labelledby="next-step-title">
      <div className="section-title"><div><div className="label">Ahora</div><h2 id="next-step-title">Tu próximo paso</h2></div></div>
      <div className={`priority-grid ${recentActivity&&primaryPending?"two":"one"}`}>
        {recentActivity&&<div className="card featured priority-card"><div><span className="badge ok">Continuar</span><h3>{recentActivity.title}</h3><p className="muted small">{recentActivity.course.name} · retomá la conversación desde tu último mensaje.</p></div><Link className="btn" href={`/student/chat/${recentActivity.id}`}>Continuar conversación</Link></div>}
        {primaryPending&&<div className="card priority-card"><div><span className="badge warn">Feedback pendiente</span><h3>{primaryPending.title}</h3><p className="muted small">{primaryPending.course.name} · tu respuesta es anónima para el docente y lleva menos de un minuto.</p></div><Link className={recentActivity?"btn secondary":"btn"} href={`/student/feedback/${primaryPending.id}`}>Dar feedback</Link></div>}
      </div>
      {pendingFeedback.length>1&&<p className="small muted section-note">Además tenés {pendingFeedback.length-1} feedback{pendingFeedback.length-1===1?"":"s"} pendiente{pendingFeedback.length-1===1?"":"s"} en tus cursos.</p>}
    </section>}

    <div className="grid two home-grid">
      <section><div className="section-title"><div><div className="label">Tus cursos</div><h2>Continuar aprendiendo</h2><p>Entrá a un curso para ver actividades, feedback e historial.</p></div></div>{enrollments.length?<div className="stack">{enrollments.map(({course})=><Link key={course.id} href={`/student/courses/${course.id}`} className="card interactive course-row"><div><div className="spread"><div><h3>{course.name}</h3><p className="muted small">{course.description}</p></div><span className="badge gray">{course._count.activities} actividad{course._count.activities===1?"":"es"}</span></div></div><span className="link">Abrir curso →</span></Link>)}</div>:<div className="empty"><strong>Todavía no tenés cursos</strong><span>Usá el código de ingreso que te comparta un docente. Cuando te sumes, tus actividades aparecerán acá.</span></div>}</section>
      <section><div className="section-title"><div><div className="label">Nuevo curso</div><h2>Ingresar con código</h2><p>El código identifica el curso y te inscribe con esta cuenta.</p></div></div><div className="card featured"><JoinCourseForm/></div></section>
    </div>

    <div className="privacy-compact footer-privacy">Tus conversaciones son privadas para el docente. Educai analiza señales agregadas del grupo para apoyar decisiones pedagógicas, no perfiles individuales.</div>
  </div>;
}
