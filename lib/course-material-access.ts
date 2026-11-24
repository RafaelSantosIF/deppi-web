import { can } from "@/lib/permissions";
import { normalizeEnrollments } from "@/lib/enrollments";
import { getCourseRecord } from "@/lib/course-api";
import { authorizedRequest, readSession } from "@/lib/session";

type CourseMaterialAccessResult =
  | {
      session: NonNullable<Awaited<ReturnType<typeof readSession>>>;
      course: Record<string, unknown>;
      isStaff: true;
      isApprovedStudent: false;
    }
  | {
      session: NonNullable<Awaited<ReturnType<typeof readSession>>>;
      course: null;
      isStaff: false;
      isApprovedStudent: true;
    }
  | { denied: Response };

export async function getCourseMaterialAccess(
  courseId: string,
): Promise<CourseMaterialAccessResult> {
  const session = await readSession();
  if (!session) {
    return {
      denied: Response.json(
        { success: false, error: "Sessão encerrada. Entre novamente." },
        { status: 401 },
      ),
    };
  }

  const isManager = can(session.user, "manage-courses", "edit-any-course");
  const canOwnCourse = can(session.user, "edit-own-course");
  if (isManager || canOwnCourse) {
    const course = await getCourseRecord(courseId);
    if (!course) {
      return {
        denied: Response.json(
          { success: false, error: "Curso não encontrado." },
          { status: 404 },
        ),
      };
    }
    const isOwner =
      canOwnCourse && Number(course.responsibleId) === session.user.id;
    if (isManager || isOwner) {
      return {
        session,
        course,
        isStaff: true,
        isApprovedStudent: false,
      };
    }
  }

  if (can(session.user, "enroll", "manage-own-enrollments")) {
    const enrollments = normalizeEnrollments(
      await authorizedRequest<unknown>("/enroll/enrollments/me"),
    );
    const isApprovedStudent = enrollments.some(
      (enrollment) =>
        enrollment.course.id === Number(courseId) &&
        enrollment.status === "APPROVED",
    );
    if (isApprovedStudent) {
      return { session, course: null, isStaff: false, isApprovedStudent: true };
    }
  } else {
    return {
      denied: Response.json(
        { success: false, error: "Você não tem acesso aos materiais deste curso." },
        { status: 404 },
      ),
    };
  }

  return {
    denied: Response.json(
      { success: false, error: "Você não tem acesso aos materiais deste curso." },
      { status: 404 },
    ),
  };
}
