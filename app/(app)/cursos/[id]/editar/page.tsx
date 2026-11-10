import { notFound, redirect } from "next/navigation";
import { CourseEditor } from "@/components/course-editor";
import { ApiError } from "@/lib/api";
import { can } from "@/lib/permissions";
import { canAssignCourseResponsible } from "@/lib/course-permissions";
import { normalizeCourseProfessors } from "@/lib/course-professors";
import { normalizeCourses } from "@/lib/courses";
import { normalizeInstitutions } from "@/lib/institutions";
import { authorizedRequest, pageRequest, requireSession } from "@/lib/session";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) notFound();

  let course: ReturnType<typeof normalizeCourses>[number] | undefined;
  try {
    const data = await pageRequest<unknown>(`/courses/${id}`, `/cursos/${id}/editar`);
    course = normalizeCourses([data])[0];
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    if (error instanceof ApiError && error.status === 403) redirect("/403");
    if (!(error instanceof ApiError)) throw error;
    throw error;
  }
  if (!course?.id) notFound();

  const isManager = can(session.user, "manage-courses", "edit-any-course");
  const isOwner = course.responsibleId === session.user.id;
  if (!isManager && (!isOwner || !can(session.user, "edit-own-course"))) {
    redirect("/403");
  }
  if (!isManager && course.status === "PENDING_APPROVAL") {
    redirect(`/cursos/${id}`);
  }

  const assignResponsible = canAssignCourseResponsible(session.user);
  let institutions: ReturnType<typeof normalizeInstitutions> = [];
  let institutionsError = "";
  try {
    institutions = normalizeInstitutions(
      await authorizedRequest<unknown>("/institutions?active=true"),
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/login");
    if (!(error instanceof ApiError)) throw error;
    institutionsError =
      "A API não autorizou consultar instituições ativas. A leitura de /institutions?active=true deve ser permitida para usuários autenticados.";
  }

  let professors: ReturnType<typeof normalizeCourseProfessors> = [];
  let professorsError = "";
  if (assignResponsible) {
    try {
      professors = normalizeCourseProfessors(
        await pageRequest<unknown>(
          "/professors?active=true",
          `/cursos/${id}/editar`,
        ),
      );
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      professorsError =
        "Não foi possível carregar os professores ativos para trocar o responsável.";
    }
  }

  return (
    <CourseEditor
      course={course}
      institutions={institutions}
      institutionsError={institutionsError}
      professors={professors}
      professorsError={professorsError}
      responsibleId={session.user.id}
      responsibleName={session.user.name}
      canAssignResponsible={assignResponsible}
    />
  );
}
