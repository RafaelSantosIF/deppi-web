import { apiErrorResponse } from "@/lib/api";
import { requireCoursePermission } from "@/lib/course-api";
import { authorizedRequest } from "@/lib/session";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ enrollmentId: string }> },
) {
  const denied = await requireCoursePermission("manage-own-enrollments");
  if (denied) return denied;
  const { enrollmentId } = await context.params;
  if (!/^[1-9]\d*$/.test(enrollmentId)) {
    return Response.json(
      { success: false, error: "Inscrição não encontrada." },
      { status: 404 },
    );
  }
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json(
      { success: false, error: "Informe os dados da renda familiar." },
      { status: 400 },
    );
  }
  const payload = body as Record<string, unknown>;
  if (
    typeof payload.householdIncomeCents !== "number" ||
    !Number.isInteger(payload.householdIncomeCents) ||
    payload.householdIncomeCents < 0 ||
    typeof payload.householdSize !== "number" ||
    !Number.isInteger(payload.householdSize) ||
    payload.householdSize < 1
  ) {
    return Response.json(
      { success: false, error: "Informe uma renda válida e ao menos uma pessoa no domicílio." },
      { status: 400 },
    );
  }
  try {
    const data = await authorizedRequest<unknown>(
      `/enroll/enrollments/${enrollmentId}`,
      { method: "PATCH", body: JSON.stringify(payload) },
    );
    return Response.json({ success: true, data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
