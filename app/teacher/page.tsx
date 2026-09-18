import Link from "next/link";
import { requireTeacher } from "@/src/lib/auth";
import { db } from "@/src/lib/db";

export default async function TeacherHome(){
 const user=await requireTeacher();
 const courses=await db.course.findMany({where:{teacherId:user.teacher.id},include:{_count:{select:{enrollments:true,activities:true,conversations:true}},insights:{where:{evidenceState:"SUFFICIENT"},select:{id:true}}},orderBy:{updatedAt:"desc"}});
 return <div className="shell"><section className="hero"><div className="label">Espacio docente</div><h1>Convertí conversaciones de aprendizaje en decisiones de clase.</h1><p>Educai resume evidencia agregada del grupo. No muestra perfiles individuales ni permite abrir conversaciones de estudiantes.</p><Link className="btn" href="/teacher/courses/new">Crear curso</Link></section>
 <section className="section"><div className="section-title"><div><div className="label">Cursos</div><h2>Mis cursos</h2></div></div>{courses.length?<div className="grid two">{courses.map(c=><Link href={`/teacher/courses/${c.id}`} className="card" key={c.id}><div className="spread"><div><h3>{c.name}</h3><p className="muted">{c.description}</p></div><span className={`badge ${c.insights.length?"ok":"gray"}`}>{c.insights.length?`${c.insights.length} insights con evidencia`:"Sin patrón suficiente"}</span></div><div className="row small muted"><span>{c._count.enrollments} estudiantes</span><span>·</span><span>{c._count.conversations} conversaciones</span><span>·</span><span>{c._count.activities} actividades</span></div></Link>)}</div>:<div className="empty">Todavía no creaste cursos. El primer paso es crear uno y agregar contenido validado.</div>}</section></div>
}
