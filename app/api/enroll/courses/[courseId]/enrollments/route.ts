import { apiErrorResponse } from "@/lib/api";
import { requireCoursePermission } from "@/lib/course-api";
import { authorizedRequest, readSession } from "@/lib/session";

function validEnrollmentPayload(
  body: unknown,
): body is Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const enrollment = body as Record<string, unknown>;
  const start = Date.parse(String(enrollment.participationStart ?? ""));
  const end = Date.parse(String(enrollment.participationEnd ?? ""));
  return (
    (enrollment.registration === undefined ||
      (typeof enrollment.registration === "string" &&
        enrollment.registration.length <= 20)) &&
    typeof enrollment.name === "string" &&
    enrollment.name.trim().length > 0 &&
    typeof enrollment.institution === "string" &&
    enrollment.institution.trim().length > 0 &&
    typeof enrollment.category === "string" &&
    enrollment.category.trim().length > 0 &&
    typeof enrollment.bond === "string" &&
    enrollment.bond.trim().length > 0 &&
    typeof enrollment.receivesScholarship === "boolean" &&
    typeof enrollment.dedicatedHours === "number" &&
    Number.isInteger(enrollment.dedicatedHours) &&
    enrollment.dedicatedHours > 0 &&
    typeof enrollment.householdIncomeCents === "number" &&
    Number.isInteger(enrollment.householdIncomeCents) &&
    enrollment.householdIncomeCents >= 0 &&
    typeof enrollment.householdSize === "number" &&
    Number.isInteger(enrollment.householdSize) &&
    enrollment.householdSize >= 1 &&
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    end >= start
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ courseId: string }> },
) {
  const denied = await requireCoursePermission("enroll");
  if (denied) return denied;
  const { courseId } = await context.params;
  if (!/^[1-9]\d*$/.test(courseId)) {
    return Response.json(
      { success: false, error: "Curso não encontrado." },
      { status: 404 },
    );
  }
  const body: unknown = await request.json().catch(() => null);
  if (!validEnrollmentPayload(body)) {
    return Response.json(
      { success: false, error: "Preencha corretamente os dados da inscrição." },
      { status: 400 },
    );
  }
  const session = await readSession();
  if (!session) {
    return Response.json(
      { success: false, error: "Sessão encerrada. Entre novamente." },
      { status: 401 },
    );
  }

  try {
    const data = await authorizedRequest<unknown>(
      `/enroll/courses/${courseId}/enrollments`,
      {
        method: "POST",
        body: JSON.stringify({
          ...body,
          ...(typeof body.registration === "string" && body.registration.trim()
            ? { registration: body.registration.trim() }
            : {}),
          userId: session.user.id,
        }),
      },
    );
    return Response.json({ success: true, data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
