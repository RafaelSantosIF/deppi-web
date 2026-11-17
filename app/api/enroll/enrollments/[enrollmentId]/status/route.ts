import { apiErrorResponse } from "@/lib/api";
import { requireCoursePermission } from "@/lib/course-api";
import { authorizedRequest } from "@/lib/session";

const statuses = new Set(["APPROVED", "REJECTED", "WAITLISTED", "CANCELLED"]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ enrollmentId: string }> },
) {
  const denied = await requireCoursePermission(
    "manage-enrollments",
    "manage-any-enrollments",
  );
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
      { success: false, error: "Informe a decisão para a inscrição." },
      { status: 400 },
    );
  }
  const payload = body as Record<string, unknown>;
  const status = payload.status;
  const reason = typeof payload.reason === "string" ? payload.reason.trim() : "";
  if (
    typeof status !== "string" ||
    !statuses.has(status) ||
    reason.length > 500 ||
    (status === "REJECTED" && !reason)
  ) {
    return Response.json(
      {
        success: false,
        error:
          status === "REJECTED" && !reason
            ? "Informe o motivo do indeferimento."
            : "Decisão inválida.",
      },
      { status: 400 },
    );
  }
  try {
    const data = await authorizedRequest<unknown>(
      `/enroll/enrollments/${enrollmentId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
      },
    );
    return Response.json({ success: true, data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
