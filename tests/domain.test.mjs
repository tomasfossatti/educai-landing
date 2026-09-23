import test from "node:test";
import assert from "node:assert/strict";
import { evidenceState, aggregateConceptSignals, anonymizeSnippet, canTransitionRecommendation, prePostDescriptor, validateFeedbackAssociation } from "../src/lib/domain.mjs";
import { assertRole, canTeacherAccessCourse, canStudentAccessCourse } from "../src/lib/authorization.mjs";
import { validateAnalysisPayload } from "../src/lib/analysis-schema.mjs";
import { classifyTrend, createSnapshotsIdempotently, selectInterventionWindows } from "../src/lib/snapshot-domain.mjs";

test("evidence threshold distinguishes no data, insufficient and sufficient",()=>{
  assert.equal(evidenceState(0,3),"NO_DATA");
  assert.equal(evidenceState(2,3),"INSUFFICIENT");
  assert.equal(evidenceState(3,3),"SUFFICIENT");
});

test("aggregation deduplicates a very active participant",()=>{
  const signals=[
    {conceptId:"c1",participantKey:"p1",evidenceSnippet:"duda 1"},
    {conceptId:"c1",participantKey:"p1",evidenceSnippet:"duda 2"},
    {conceptId:"c1",participantKey:"p2",evidenceSnippet:"duda 3"},
    {conceptId:"c1",participantKey:"p3",evidenceSnippet:"duda 4"}
  ];
  const [result]=aggregateConceptSignals(signals,5,3);
  assert.equal(result.affectedParticipants,3);
  assert.equal(result.evidenceState,"SUFFICIENT");
  assert.equal(result.proportion,.6);
});

test("anonymization removes obvious email, phone and identifiers",()=>{
  const out=anonymizeSnippet("Escribime a ana@uni.edu, +54 351 555 7788. Legajo: ABCD-1234");
  assert.match(out,/\[email\]/); assert.match(out,/\[teléfono\]/); assert.match(out,/\[identificador\]/);
  assert.doesNotMatch(out,/ana@uni\.edu/);
});

test("recommendation state machine blocks reopening terminal states",()=>{
  assert.equal(canTransitionRecommendation("GENERATED","VIEWED"),true);
  assert.equal(canTransitionRecommendation("VIEWED","APPLIED"),true);
  assert.equal(canTransitionRecommendation("APPLIED","VIEWED"),false);
  assert.equal(canTransitionRecommendation("DISCARDED","APPLIED"),false);
});

test("role and course-scope helpers isolate teacher and student access",()=>{
  const teacher={role:"TEACHER",teacher:{id:"t1"}};
  const student={role:"STUDENT",student:{id:"s1"}};
  assert.equal(canTeacherAccessCourse(teacher,{teacherId:"t1"}),true);
  assert.equal(canTeacherAccessCourse(teacher,{teacherId:"t2"}),false);
  assert.equal(canStudentAccessCourse(student,{studentId:"s1"}),true);
  assert.equal(canStudentAccessCourse(student,{studentId:"s2"}),false);
  assert.throws(()=>assertRole(student,"TEACHER"));
});

test("structured analysis validator accepts valid payload and rejects free-form data",()=>{
  const valid={concepts:[{concept:"correlación y causalidad",signals:[{type:"CONFUSION",evidence_message_id:"m1",evidence_snippet:"No entiendo la diferencia"}],explanation_patterns:[{type:"CONCRETE_EXAMPLE",observed_signal:"EXPLICIT_CONFIRMATION",evidence_message_id:"m2"}]}]};
  assert.equal(validateAnalysisPayload(valid).concepts[0].signals[0].type,"CONFUSION");
  assert.throws(()=>validateAnalysisPayload({concepts:[{concept:"x",signals:[{type:"DIAGNOSIS"}],explanation_patterns:[]}]}));
});

test("pre/post comparison explicitly refuses causal interpretation",()=>{
  const result=prePostDescriptor({beforeAffected:4,beforeTotal:5,afterDoubt:1,afterTotal:4});
  assert.equal(result.before.rate,.8); assert.equal(result.after.rate,.25); assert.equal(result.comparableAsCausalEffect,false);
  assert.match(result.limitation,/no demuestra causalidad/i);
});

test("feedback association rejects cross-course session or concept",()=>{
  assert.equal(validateFeedbackAssociation({feedbackCourseId:"course-a",sessionCourseId:"course-a",conceptCourseId:"course-a"}),true);
  assert.throws(()=>validateFeedbackAssociation({feedbackCourseId:"course-a",sessionCourseId:"course-b",conceptCourseId:"course-a"}));
  assert.throws(()=>validateFeedbackAssociation({feedbackCourseId:"course-a",sessionCourseId:"course-a",conceptCourseId:"course-b"}));
});

const trendThresholds={minParticipantsForNew:3,minParticipantChange:2,minRelativeChange:.25};

test("trend classification covers new, rising, stable and falling",()=>{
  assert.equal(classifyTrend(null,{participantCount:3,evidenceState:"SUFFICIENT"},trendThresholds),"NEW");
  assert.equal(classifyTrend({participantCount:4,evidenceState:"SUFFICIENT"},{participantCount:7,evidenceState:"SUFFICIENT"},trendThresholds),"RISING");
  assert.equal(classifyTrend({participantCount:4,evidenceState:"SUFFICIENT"},{participantCount:5,evidenceState:"SUFFICIENT"},trendThresholds),"STABLE");
  assert.equal(classifyTrend({participantCount:7,evidenceState:"SUFFICIENT"},{participantCount:4,evidenceState:"SUFFICIENT"},trendThresholds),"FALLING");
});

test("small variations stay stable and NO_DATA is absence, never change",()=>{
  assert.equal(classifyTrend({participantCount:10,evidenceState:"SUFFICIENT"},{participantCount:12,evidenceState:"SUFFICIENT"},trendThresholds),"STABLE");
  assert.equal(classifyTrend({participantCount:5,evidenceState:"SUFFICIENT"},{participantCount:0,evidenceState:"NO_DATA"},trendThresholds),null);
  assert.equal(classifyTrend({participantCount:0,evidenceState:"NO_DATA"},{participantCount:2,evidenceState:"INSUFFICIENT"},trendThresholds),"STABLE");
});

test("snapshot insertion delegates once with an idempotent conflict contract",async()=>{
  const stored=new Set();
  const insert=async rows=>{let count=0;for(const row of rows){const key=`${row.sessionId}:${row.conceptId}`;if(!stored.has(key)){stored.add(key);count++;}}return {count};};
  const rows=[{sessionId:"s1",conceptId:"c1"}];
  assert.deepEqual(await createSnapshotsIdempotently(rows,insert),{count:1});
  assert.deepEqual(await createSnapshotsIdempotently(rows,insert),{count:0});
});

test("intervention comparison selects its session and nearest safe prior window",()=>{
  const sessions=[
    {id:"old",startedAt:new Date("2026-01-01T10:00:00Z"),endedAt:new Date("2026-01-01T11:00:00Z")},
    {id:"previous",startedAt:new Date("2026-01-08T10:00:00Z"),endedAt:new Date("2026-01-08T11:00:00Z")},
    {id:"post",startedAt:new Date("2026-01-15T10:00:00Z"),endedAt:new Date("2026-01-15T11:00:00Z")},
    {id:"open",startedAt:new Date("2026-01-22T10:00:00Z"),endedAt:null}
  ];
  const windows=selectInterventionWindows({intervention:{sessionId:"post"},sessions});
  assert.equal(windows.before.sessionId,"previous");
  assert.equal(windows.after.sessionId,"post");
});
