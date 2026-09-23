import test from "node:test";
import assert from "node:assert/strict";
import { evidenceState, aggregateConceptSignals, anonymizeSnippet, canTransitionRecommendation, prePostDescriptor, validateFeedbackAssociation } from "../src/lib/domain.mjs";
import { assertRole, canTeacherAccessCourse, canStudentAccessCourse } from "../src/lib/authorization.mjs";
import { validateAnalysisPayload } from "../src/lib/analysis-schema.mjs";
import { isRetrievableMaterialState, messageSourceRows, rankHybridCandidates, readableSource } from "../src/lib/retrieval-domain.mjs";

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

test("retrieval includes exclusively ACTIVE material states",()=>{
  assert.equal(isRetrievableMaterialState("ACTIVE"),true);
  assert.equal(isRetrievableMaterialState("DRAFT"),false);
  assert.equal(isRetrievableMaterialState("RETIRED"),false);
});

test("hybrid ranking merges channels and keeps lexical fallback",()=>{
  const material={title:"Unidad 3"};
  const lexical=[{id:"shared",text:"a",position:0,material},{id:"lexical",text:"b",position:1,material}];
  const semantic=[{id:"semantic",text:"c",position:2,material},{id:"shared",text:"a",position:0,material}];
  const hybrid=rankHybridCandidates(lexical,semantic,3);
  assert.equal(hybrid[0].id,"shared");
  assert.equal(hybrid[0].retrievalMethod,"HYBRID");
  assert.deepEqual(hybrid.map(item=>item.rank),[1,2,3]);
  const fallback=rankHybridCandidates(lexical,[],2);
  assert.deepEqual(fallback.map(item=>item.id),["shared","lexical"]);
  assert.ok(fallback.every(item=>item.retrievalMethod==="LEXICAL"));
});

test("provenance belongs to the created assistant message",()=>{
  const rows=messageSourceRows("assistant-42",[{id:"chunk-1",score:.02,rank:1,retrievalMethod:"HYBRID"}]);
  assert.deepEqual(rows,[{messageId:"assistant-42",contentChunkId:"chunk-1",retrievalMethod:"HYBRID",retrievalScore:.02,rank:1}]);
});

test("student source labels contain readable location without technical data",()=>{
  const label=readableSource("Introducción a causalidad",2);
  assert.equal(label,"Introducción a causalidad · Fragmento 3");
  assert.doesNotMatch(label,/chunk-|retrievalScore|0\.\d/i);
});
