import { redirect } from "next/navigation";
import { CoursesManagement } from "@/components/courses-management";
import { can } from "@/lib/permissions";
import { ApiError } from "@/lib/api";
import { authorizedRequest, requireSession } from "@/lib/session";
import type { CourseSummary, Institution } from "@/lib/types";
import { normalizeCourses } from "@/lib/courses";
import { normalizeInstitutions } from "@/lib/institutions";

export default async function CoursesPage() {
  const session = await requireSession();
  if (
    !can(
      session.user,
      "view-courses",
      "manage-courses",
      "create-course",
      "edit-own-course",
    )
  ) {
    redirect("/403");
  }

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
