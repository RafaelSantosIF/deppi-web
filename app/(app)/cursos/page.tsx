import { redirect } from "next/navigation";
import { StudentCourses } from "@/components/student-courses";
import { CoursesManagement } from "@/components/courses-management";
import { ApiError } from "@/lib/api";
import { can } from "@/lib/permissions";
import { authorizedRequest, requireSession } from "@/lib/session";
import { hasOpenEnrollment, normalizeCourses } from "@/lib/courses";
import { normalizeInstitutions } from "@/lib/institutions";
import { normalizeEnrollments } from "@/lib/enrollments";
import type {
  CourseSummary,
  EnrollmentSummary,
  Institution,
} from "@/lib/types";

export default async function CoursesPage() {
  const session = await requireSession();
  const canManage = can(
    session.user,
    "manage-courses",
    "create-course",
    "edit-own-course",
    "edit-any-course",
  );
  const canEnroll = can(session.user, "enroll");
  if (canEnroll && !canManage) {
    let courses: CourseSummary[] = [];
    let enrollments: EnrollmentSummary[] = [];
    let initialError = false;
    try {
      const [courseData, enrollmentData] = await Promise.all([
        authorizedRequest<unknown>("/courses?status=PUBLISHED"),
        authorizedRequest<unknown>("/enroll/enrollments/me"),
      ]);
      courses = normalizeCourses(courseData).filter(hasOpenEnrollment);
      enrollments = normalizeEnrollments(enrollmentData);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) redirect("/login");
      if (!(error instanceof ApiError)) throw error;
      initialError = true;
    }
    return (
      <StudentCourses
        initialCourses={courses}
        initialEnrollments={enrollments}
        initialError={initialError}
      />
    );
  }

  const canManageCourses = can(
    session.user,
    "view-courses",
    "manage-courses",
    "create-course",
    "edit-own-course",
  );
  if (!canManageCourses) redirect("/403");

  let courses: CourseSummary[] = [];
  let initialError = false;
  try {
    const data = await authorizedRequest<unknown>("/courses");
    const allCourses = normalizeCourses(data);
    courses = can(session.user, "manage-courses", "edit-any-course")
      ? allCourses
      : allCourses.filter(
          (course) =>
            course.status === "PUBLISHED" ||
            course.responsibleId === session.user.id,
        );
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/login");
    if (!(error instanceof ApiError)) throw error;
    initialError = true;
  }

  let institutions: Institution[] = [];
  let institutionsError = "";
  try {
    institutions = normalizeInstitutions(
      await authorizedRequest<unknown>("/institutions?active=true"),
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/login");
    if (!(error instanceof ApiError)) throw error;
    institutionsError =
      error.status === 403
        ? "A API precisa permitir GET /institutions?active=true para usuários autenticados."
        : "Não foi possível carregar as instituições para filtrar os cursos.";
  }

  return (
    <CoursesManagement
      initialCourses={courses}
      initialInstitutions={institutions}
      initialError={initialError}
      institutionsError={institutionsError}
      canManage={can(session.user, "manage-courses")}
      canCreate={can(session.user, "create-course", "manage-courses")}
      canEditOwn={can(session.user, "edit-own-course")}
      responsibleId={session.user.id}
    />
  );
}
