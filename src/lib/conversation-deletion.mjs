/** Delete the source graph transactionally, then rebuild every derived course aggregate. */
export async function deleteConversationAndRefresh({ db, conversationId, studentId, refreshCourseInsights }) {
  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, studentId },
    select: { id: true, courseId: true }
  });
  if (!conversation) throw new Error("Conversación no encontrada");
  await db.conversation.delete({ where: { id: conversation.id } });
  await refreshCourseInsights(conversation.courseId);
  return { courseId: conversation.courseId };
}
