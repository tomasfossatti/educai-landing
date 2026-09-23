const FORBIDDEN_KEYS = new Set(["studentId", "email", "name", "participantKey", "conversation", "conversations"]);

export function assertTeacherDtoPrivacy(value, path = "dto") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertTeacherDtoPrivacy(item, `${path}[${index}]`));
    return value;
  }
  if (!value || typeof value !== "object") return value;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) throw new Error(`Teacher DTO exposes forbidden field ${path}.${key}`);
    assertTeacherDtoPrivacy(child, `${path}.${key}`);
  }
  return value;
}

export function teacherInsightDto(insight) {
  const dto = {
    id: insight.id,
    concept: insight.concept?.name ?? insight.conceptLabel,
    affectedParticipants: insight.affectedParticipants,
    totalParticipants: insight.totalParticipants,
    evidenceState: insight.evidenceState,
    summary: insight.summary,
    evidence: insight.evidenceState === "SUFFICIENT" ? insight.evidence ?? [] : []
  };
  return assertTeacherDtoPrivacy(dto);
}
