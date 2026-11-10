import { redirect } from "next/navigation";
import { CourseEditor } from "@/components/course-editor";
import { ApiError } from "@/lib/api";
import { can } from "@/lib/permissions";
import { canAssignCourseResponsible } from "@/lib/course-permissions";
import { normalizeCourseProfessors } from "@/lib/course-professors";
import { normalizeInstitutions } from "@/lib/institutions";
import { authorizedRequest, pageRequest, requireSession } from "@/lib/session";

export default async function NewCoursePage() {
  const session = await requireSession();
  if (!can(session.user, "create-course", "manage-courses")) redirect("/403");

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
        await pageRequest<unknown>("/professors?active=true", "/cursos/novo"),
      );
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      professorsError =
        "Não foi possível carregar os professores ativos para atribuir este curso.";
    }
  }

  return (
    <CourseEditor
      course={null}
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
