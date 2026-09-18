export function assertRole(user, role) {
  if (!user || user.role !== role) throw new Error("FORBIDDEN_ROLE");
  return true;
}

export function canTeacherAccessCourse(user, course) {
  return Boolean(user?.role === "TEACHER" && user.teacher?.id && course?.teacherId === user.teacher.id);
}

export function canStudentAccessCourse(user, enrollment) {
  return Boolean(user?.role === "STUDENT" && user.student?.id && enrollment?.studentId === user.student.id);
}

export function assertTeacherCourseScope(user, course) {
  if (!canTeacherAccessCourse(user, course)) throw new Error("FORBIDDEN_COURSE");
  return true;
}

export function assertStudentCourseScope(user, enrollment) {
  if (!canStudentAccessCourse(user, enrollment)) throw new Error("FORBIDDEN_COURSE");
  return true;
}
