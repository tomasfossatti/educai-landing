import Link from "next/link";
import { requireStudent } from "@/src/lib/auth";
import { db } from "@/src/lib/db";
import { JoinCourseForm } from "../components/join-course-form";

export default async function StudentHome(){
  const user=await requireStudent();
  const [enrollments,recentConversation,pendingFeedback]=await Promise.all([
    db.enrollment.findMany({where:{studentId:user.student.id},include:{course:{include:{_count:{select:{activities:true}}}}},orderBy:{joinedAt:"desc"}}),
    db.conversation.findFirst({where:{studentId:user.student.id,status:"ACTIVE",activityId:{not:null}},include:{activity:{include:{course:true}},_count:{select:{messages:true}}},orderBy:{updatedAt:"desc"}}),
    db.classSession.findMany({where:{status:"CLOSED",course:{enrollments:{some:{studentId:user.student.id}}},classFeedback:{none:{studentId:user.student.id}}},include:{course:true},orderBy:{endedAt:"desc"},take:3})
  ]);
  const recentActivity=recentConversation?.activity;
  const primaryPending=pendingFeedback[0];

  return <div className="shell student-home">
    <section className="student-home-intro"><h1>Hola, {user.name.split(" ")[0]}</h1></section>

    {recentActivity&&<section className="student-primary-section" aria-labelledby="continue-title">
      <h2 id="continue-title">Continuá donde quedaste</h2>
      <Link className="continue-card" href={`/student/chat/${recentActivity.id}`}>
        <div className="continue-card-main"><div className="continue-course-line"><span>{recentActivity.course.name}</span><span className="status-text">En progreso</span></div><h3>{recentActivity.title}</h3><p>{recentConversation?._count.messages??0} mensajes · retomá desde tu último intercambio con el tutor.</p></div>
        <span className="continue-action">Continuar conversación →</span>
      </Link>
    </section>}

    {primaryPending&&<section className="student-feedback-reminder" aria-label="Feedback pendiente"><div><strong>{primaryPending.title}</strong><span>{primaryPending.course.name} · feedback anónimo</span></div><Link className="text-action" href={`/student/feedback/${primaryPending.id}`}>Dar feedback →</Link></section>}

    <section className="student-courses-section">
      <div className="simple-section-title"><h2>Tus cursos</h2></div>
      {enrollments.length?<div className="student-course-grid">{enrollments.map(({course})=><Link key={course.id} href={`/student/courses/${course.id}`} className="student-course-card"><div className="student-course-card-head"><h3>{course.name}</h3><span className="course-count">{course._count.activities} actividad{course._count.activities===1?"":"es"}</span></div><p>{course.description}</p><span className="text-action">Abrir curso →</span></Link>)}</div>:<div className="student-empty-line">Todavía no tenés cursos.</div>}

      <details className="join-course-disclosure" open={!enrollments.length}><summary>+ Unirme a un curso</summary><div className="join-course-panel"><JoinCourseForm/></div></details>
    </section>
  </div>;
}
