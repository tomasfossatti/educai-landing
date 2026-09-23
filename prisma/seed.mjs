import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const password = "educai-demo";
function hashPassword(value) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto.scryptSync(value, salt, 64).toString("base64url");
  return { salt, hash };
}
function analyticsKey(courseId, studentId) {
  const pepper = process.env.ANALYTICS_PEPPER || "seed-only-pepper";
  return crypto.createHmac("sha256", pepper).update(`${courseId}:${studentId}`).digest("hex");
}

async function createUser({email,name,role}) {
  const {salt,hash}=hashPassword(password);
  return db.user.create({data:{email,name,role,passwordHash:hash,passwordSalt:salt,teacher:role==="TEACHER"?{create:{}}:undefined,student:role==="STUDENT"?{create:{}}:undefined},include:{teacher:true,student:true}});
}

async function main(){
  await db.authSession.deleteMany();
  await db.user.deleteMany();

  const teacher=await createUser({email:"docente@educai.demo",name:"Marina López",role:"TEACHER"});
  const students=[];
  for (const [i,name] of ["Ana Torres","Bruno Díaz","Camila Ruiz","Diego Pérez","Elena Soto"].entries()) students.push(await createUser({email:`estudiante${i+1}@educai.demo`,name,role:"STUDENT"}));

  const course=await db.course.create({data:{teacherId:teacher.teacher.id,name:"Sociología I · Demo",description:"Curso demo para validar cómo las conversaciones con IA se convierten en evidencia pedagógica agregada y accionable.",joinCode:"DEMO2026"}});
  await db.enrollment.createMany({data:students.map(s=>({courseId:course.id,studentId:s.student.id}))});
  const activity=await db.activity.create({data:{courseId:course.id,title:"Correlación, causalidad y sesgos",description:"Usá el tutor para trabajar diferencias conceptuales y discutir ejemplos aplicados."}});

  const material=await db.learningMaterial.create({data:{courseId:course.id,title:"Guía validada: inferencia y causalidad",type:"MARKDOWN",state:"ACTIVE"}});
  const rawText=`# Correlación y causalidad\nUna correlación describe una asociación entre variables. Por sí sola no demuestra que una variable produzca cambios en otra. Para sostener causalidad se necesitan diseños, supuestos y evidencia adicionales que permitan descartar explicaciones alternativas.\n\n# Variables de confusión\nUna tercera variable puede explicar parte o toda una asociación observada. Comparar casos y buscar explicaciones alternativas ayuda a evitar inferencias causales apresuradas.\n\n# Sesgo de selección\nOcurre cuando la forma de seleccionar observaciones produce una muestra que no representa adecuadamente la población o distorsiona la relación estudiada.\n\n# Ejemplos\nQue aumenten simultáneamente las ventas de helado y los rescates acuáticos no implica que comprar helado cause accidentes: la temperatura puede afectar ambas variables.`;
  const version=await db.learningMaterialVersion.create({data:{materialId:material.id,version:1,rawText,fileName:"guia-inferencia.md",fileMime:"text/markdown"}});
  const chunkTexts=[rawText.slice(0,520),rawText.slice(520)];
  const chunks=[];
  for (const [position,text] of chunkTexts.entries()) chunks.push(await db.contentChunk.create({data:{courseId:course.id,materialId:material.id,versionId:version.id,position,text,searchText:text.toLowerCase()}}));

  const corr=await db.concept.create({data:{courseId:course.id,name:"correlación y causalidad",slug:"correlacion-y-causalidad"}});
  const selection=await db.concept.create({data:{courseId:course.id,name:"sesgo de selección",slug:"sesgo-de-seleccion"}});
  const corrEvidence=[
    "Entiendo qué es correlación, pero ¿por qué no alcanza para decir que una cosa causa la otra?",
    "Me confunde la diferencia entre correlación y causalidad cuando las dos variables cambian juntas.",
    "Si dos variables tienen una correlación muy alta, ¿igual puede no haber causalidad?",
    "¿Cómo distingo una causa real de una tercera variable que está afectando a las dos?"
  ];
  const assistantReplies=[
    "Pensalo con temperatura, ventas de helado y rescates: la asociación aparece, pero hay una tercera variable posible.",
    "Una forma útil es comparar: correlación describe asociación; causalidad agrega una afirmación sobre el mecanismo o efecto.",
    "Sí. Una correlación alta sigue siendo asociación. Para sostener causalidad necesitás evidencia adicional.",
    "Buscá explicaciones alternativas y variables de confusión. Después preguntá qué diseño permitiría descartarlas."
  ];

  for (let i=0;i<students.length;i++) {
    const conv=await db.conversation.create({data:{courseId:course.id,activityId:activity.id,studentId:students[i].student.id,consentedAt:new Date()}});
    await db.message.create({data:{conversationId:conv.id,role:"STUDENT",content:i<4?corrEvidence[i]:"¿Qué significa población en este contexto?"}});
    await db.message.create({data:{conversationId:conv.id,role:"ASSISTANT",content:i<4?assistantReplies[i]:"La población es el conjunto sobre el que querés razonar o generalizar.",sourceChunkIds:[i<4?chunks[0].id:chunks[1].id]}});
    const analysis=await db.conversationAnalysis.create({data:{conversationId:conv.id,participantKey:analyticsKey(course.id,students[i].student.id),modelProvider:"seed",modelName:"demo"}});
    if(i<4){
      await db.conceptSignal.create({data:{analysisId:analysis.id,conceptId:corr.id,participantKey:analysis.participantKey,type:i===1?"CONFUSION":"QUESTION",evidenceSnippet:corrEvidence[i],explanationType:i<3?"CONCRETE_EXAMPLE":"COMPARISON",understandingSignal:i<3?"EXPLICIT_CONFIRMATION":"ADVANCED_WITHOUT_REPETITION"}});
      if(i<2) await db.conceptSignal.create({data:{analysisId:analysis.id,conceptId:selection.id,participantKey:analysis.participantKey,type:"QUESTION",evidenceSnippet:i===0?"¿Y si la muestra ya viene sesgada desde el principio?":"¿El sesgo de selección puede hacer aparecer una relación que no existe?",understandingSignal:"NONE"}});
    }
  }

  const corrInsight=await db.aggregatedInsight.create({data:{courseId:course.id,conceptId:corr.id,affectedParticipants:4,totalParticipants:5,proportion:.8,evidenceState:"SUFFICIENT",signalCount:4,reformulationCount:1,sessionCount:4,firstDetectedAt:new Date(Date.now()-86400000*7),lastDetectedAt:new Date(),trend:"STABLE",summary:"En 4 participantes independientes aparecen dificultades para diferenciar correlación de causalidad (80% de quienes participaron en conversaciones analizadas).",evidenceJson:corrEvidence,explanationJson:[{type:"CONCRETE_EXAMPLE",observedSignal:"EXPLICIT_CONFIRMATION",count:3},{type:"COMPARISON",observedSignal:"ADVANCED_WITHOUT_REPETITION",count:1}]}});
  await db.aggregatedInsight.create({data:{courseId:course.id,conceptId:selection.id,affectedParticipants:2,totalParticipants:5,proportion:.4,evidenceState:"INSUFFICIENT",summary:"Aparecen señales sobre sesgo de selección, pero todavía no hay suficiente evidencia para identificar un patrón agregado.",evidenceJson:[],explanationJson:[]}});
  const recommendation=await db.recommendation.create({data:{courseId:course.id,insightId:corrInsight.id,title:"Contrastar correlación y causalidad con tres casos",rationale:corrInsight.summary,actionText:"Antes de avanzar, dedicar 10 minutos a tres casos: uno correlacional, uno con variable de confusión y uno con evidencia causal. Pedir que el grupo clasifique cada caso y justifique la decisión.",status:"APPLIED"}});
  const session=await db.classSession.create({data:{courseId:course.id,activityId:activity.id,title:"Clase 4 · De asociación a causalidad",status:"CLOSED",startedAt:new Date(Date.now()-86400000*2),endedAt:new Date(Date.now()-86400000*2+5400000),feedbackSummary:"La valoración general fue positiva. Los casos concretos ayudaron, aunque aparece una dificultad puntual cuando interviene una tercera variable.",feedbackRecommendation:"En la próxima clase, comenzá con un caso de variable de confusión y pedí que el grupo identifique primero la tercera variable antes de discutir causalidad.",feedbackGeneratedAt:new Date()}});
  await db.teacherIntervention.create({data:{courseId:course.id,insightId:corrInsight.id,recommendationId:recommendation.id,conceptId:corr.id,sessionId:session.id,status:"APPLIED",plannedAt:session.startedAt,appliedAt:session.startedAt,actualAction:"Se trabajaron tres casos contrastantes en grupos pequeños y cada grupo justificó por qué había correlación, confusión o evidencia causal."}});

  const feedbackRows=[
    {rating:4,comment:"Los casos prácticos me ayudaron a entenderlo."},
    {rating:4,comment:"La comparación entre ejemplos fue clara."},
    {rating:3,comment:null},
    {rating:2,comment:"Fui un poco rápido cuando apareció la tercera variable."}
  ];
  for(let i=0;i<4;i++) await db.classFeedback.create({data:{courseId:course.id,sessionId:session.id,studentId:students[i].student.id,...feedbackRows[i]}});

  console.log("Educai demo seeded");
  console.log("Teacher: docente@educai.demo / educai-demo");
  console.log("Students: estudiante1@educai.demo ... estudiante5@educai.demo / educai-demo");
  console.log("Join code: DEMO2026");
}

main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>db.$disconnect());
