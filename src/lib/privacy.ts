import crypto from "node:crypto";

export function participantKey(courseId: string, studentId: string) {
  const pepper = process.env.ANALYTICS_PEPPER;
  if (!pepper) throw new Error("ANALYTICS_PEPPER is required");
  return crypto.createHmac("sha256", pepper).update(`${courseId}:${studentId}`).digest("hex");
}
