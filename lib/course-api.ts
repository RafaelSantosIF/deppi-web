import { can } from "@/lib/permissions";
import { authorizedRequest, readSession } from "@/lib/session";
import { normalizeInstitutions } from "@/lib/institutions";
import type { PermissionSlug } from "@/lib/types";

export async function requireCoursePermission(
  ...permissions: PermissionSlug[]
) {
  const session = await readSession();
  if (!session) {
    return Response.json(
      { success: false, error: "Sessão encerrada. Entre novamente." },
      { status: 401 },
    );
  }
  if (!can(session.user, ...permissions)) {
    return Response.json(
      { success: false, error: "Você não tem permissão para esta ação." },
      { status: 403 },
    );
  }
  return null;
}

export async function getCourseRecord(id: string) {
  const data = await authorizedRequest<unknown>(`/courses/${id}`);
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;
  const course =
    root.course && typeof root.course === "object"
      ? (root.course as Record<string, unknown>)
      : root;
  return course;
}

export async function isRegisteredCourseInstitution(value: unknown) {
  if (typeof value !== "string") return false;
  const institutions = await authorizedRequest<unknown>(
    "/institutions?active=true",
  );
  return normalizeInstitutions(institutions).some(
    (institution) => institution.name === value,
  );
}

export function validCoursePayload(
  body: unknown,
): body is Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const course = body as Record<string, unknown>;
  const stringLists = [
    course.coverageMunicipalities,
    course.evaluationMethods,
    course.disclosureMethods,
  ];
  return (
    typeof course.title === "string" &&
    course.title.trim().length >= 3 &&
    typeof course.campus === "string" &&
    course.campus.trim().length > 0 &&
    typeof course.actionType === "string" &&
    course.actionType.trim().length > 0 &&
    typeof course.thematicArea === "string" &&
    course.thematicArea.trim().length > 0 &&
    typeof course.extensionLine === "string" &&
    course.extensionLine.trim().length > 0 &&
    typeof course.startDate === "string" &&
    !Number.isNaN(Date.parse(course.startDate)) &&
    typeof course.endDateEstimated === "string" &&
    !Number.isNaN(Date.parse(course.endDateEstimated)) &&
    Date.parse(course.endDateEstimated) >= Date.parse(course.startDate) &&
    typeof course.minBeneficiaries === "number" &&
    typeof course.maxBeneficiaries === "number" &&
    Number.isInteger(course.minBeneficiaries) &&
    Number.isInteger(course.maxBeneficiaries) &&
    course.minBeneficiaries > 0 &&
    course.maxBeneficiaries >= course.minBeneficiaries &&
    typeof course.executionHours === "number" &&
    course.executionHours > 0 &&
    typeof course.responsibleId === "number" &&
    Number.isInteger(course.responsibleId) &&
    course.responsibleId > 0 &&
    typeof course.location === "string" &&
    course.location.trim().length > 0 &&
    typeof course.funding === "string" &&
    course.funding.trim().length > 0 &&
    typeof course.institutionalProgram === "string" &&
    course.institutionalProgram.trim().length > 0 &&
    typeof course.offerModel === "string" &&
    course.offerModel.trim().length > 0 &&
    stringLists.every(
      (list) =>
        Array.isArray(list) &&
        list.every((item) => typeof item === "string"),
    ) &&
    typeof course.activitiesPerformed === "string" &&
    course.activitiesPerformed.trim().length > 0
  );
}
