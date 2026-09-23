import test from "node:test";
import assert from "node:assert/strict";
import { evidenceState, aggregateConceptSignals, anonymizeSnippet, canTransitionRecommendation, prePostDescriptor, validateFeedbackAssociation } from "../src/lib/domain.mjs";
import { assertRole, canTeacherAccessCourse, canStudentAccessCourse } from "../src/lib/authorization.mjs";
import { validateAnalysisPayload } from "../src/lib/analysis-schema.mjs";
import { PRIVACY_CONTRACT, hasAcceptedPrivacyContract } from "../src/lib/privacy-contract.mjs";
import { STUDY_STARTERS, chatPipelineInput } from "../src/lib/study-starters.mjs";

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

test("privacy acceptance is nullable and tied to the current contract version",()=>{
  assert.equal(hasAcceptedPrivacyContract({privacyNoticeVersion:null,privacyNoticeAcceptedAt:null}),false);
  assert.equal(hasAcceptedPrivacyContract({privacyNoticeVersion:"older",privacyNoticeAcceptedAt:new Date()}),false);
  assert.equal(hasAcceptedPrivacyContract({privacyNoticeVersion:PRIVACY_CONTRACT.version,privacyNoticeAcceptedAt:new Date()}),true);
});

test("starters and free-form messages enter the same chat pipeline input",()=>{
  const starter=STUDY_STARTERS.find(({intent})=>intent==="EXAMPLE");
  assert.equal(chatPipelineInput(`  ${starter.message}  `),starter.message);
  assert.equal(chatPipelineInput("  Mi pregunta libre  "),"Mi pregunta libre");
  assert.deepEqual(STUDY_STARTERS.map(({intent})=>intent),["EXPLAIN","EXAMPLE","COMPARE","PRACTICE","DIAGNOSE"]);
});
