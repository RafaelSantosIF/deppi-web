import type { CourseSummary } from "./types";

export function normalizeCourses(data: unknown): CourseSummary[] {
  const root =
    data && typeof data === "object"
      ? (data as Record<string, unknown>)
      : {};
  const source = Array.isArray(data)
    ? data
    : Array.isArray(root.courses)
      ? root.courses
      : [];
  return source.map((raw) => {
    const item =
      raw && typeof raw === "object"
        ? (raw as Record<string, unknown>)
        : {};
    const count =
      item._count && typeof item._count === "object"
        ? (item._count as Record<string, unknown>)
        : {};
    const approvedTeamMembers = Array.isArray(item.teamMembers)
      ? item.teamMembers.filter(
          (member) =>
            member &&
            typeof member === "object" &&
            (member as Record<string, unknown>).status === "APPROVED",
        ).length
      : undefined;
    const institution =
      item.institution && typeof item.institution === "object"
        ? (item.institution as Record<string, unknown>)
        : null;
    const list = (value: unknown) =>
      Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === "string")
        : [];
    return {
      id: Number(item.id),
      title: String(item.title ?? "Curso"),
      campus: String(item.campus ?? ""),
      status: String(item.status ?? "DRAFT"),
      actionType: String(item.actionType ?? "Curso"),
      startDate: String(item.startDate ?? ""),
      endDateEstimated: String(item.endDateEstimated ?? ""),
      executionHours: Number(item.executionHours ?? 0),
      minBeneficiaries:
        typeof item.minBeneficiaries === "number"
          ? item.minBeneficiaries
          : undefined,
      maxBeneficiaries: Number(item.maxBeneficiaries ?? 0),
      thematicArea:
        typeof item.thematicArea === "string" ? item.thematicArea : undefined,
      extensionLine:
        typeof item.extensionLine === "string" ? item.extensionLine : undefined,
      responsibleId:
        typeof item.responsibleId === "number" ? item.responsibleId : undefined,
      responsible:
        item.responsible && typeof item.responsible === "object"
          ? {
              id: Number((item.responsible as Record<string, unknown>).id),
              name: String(
                (item.responsible as Record<string, unknown>).name ?? "",
              ),
              email:
                typeof (item.responsible as Record<string, unknown>).email ===
                "string"
                  ? String(
                      (item.responsible as Record<string, unknown>).email,
                    )
                  : undefined,
            }
          : null,
      institutionId:
        typeof item.institutionId === "number"
          ? item.institutionId
          : undefined,
      institution: institution
        ? {
            id:
              typeof institution.id === "number"
                ? institution.id
                : undefined,
            name:
              typeof institution.name === "string"
                ? institution.name
                : undefined,
            acronym:
              typeof institution.acronym === "string"
                ? institution.acronym
                : null,
            city:
              typeof institution.city === "string"
                ? institution.city
                : null,
          }
        : null,
      location: typeof item.location === "string" ? item.location : undefined,
      funding: typeof item.funding === "string" ? item.funding : undefined,
      institutionalProgram:
        typeof item.institutionalProgram === "string"
          ? item.institutionalProgram
          : undefined,
      offerModel:
        typeof item.offerModel === "string" ? item.offerModel : undefined,
      coverageMunicipalities: list(item.coverageMunicipalities),
      evaluationMethods: list(item.evaluationMethods),
      disclosureMethods: list(item.disclosureMethods),
      activitiesPerformed:
        typeof item.activitiesPerformed === "string"
          ? item.activitiesPerformed
          : undefined,
      coverUrl:
        typeof item.coverUrl === "string"
          ? item.coverUrl
          : item.cover && typeof item.cover === "object" &&
              "url" in item.cover &&
              typeof item.cover.url === "string"
            ? item.cover.url
            : null,
      enrolled:
        approvedTeamMembers ??
        (typeof item.enrolled === "number" ? item.enrolled : undefined),
      enrollmentsCount:
        typeof item.enrollmentsCount === "number"
          ? item.enrollmentsCount
          : undefined,
      _count: {
        enrollments:
          typeof count.enrollments === "number" ? count.enrollments : undefined,
      },
    };
  });
}

export function enrollmentCount(course: CourseSummary) {
  return (
    course.enrolled ??
    course.enrollmentsCount ??
    course._count?.enrollments
  );
}

export function hasOpenEnrollment(course: CourseSummary) {
  const enrolled = enrollmentCount(course);
  return (
    course.status === "PUBLISHED" &&
    (enrolled === undefined || enrolled < course.maxBeneficiaries)
  );
}
