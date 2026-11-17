import { apiErrorResponse, ApiError } from "@/lib/api";
import { requireCoursePermission } from "@/lib/course-api";
import { authorizedResponse } from "@/lib/session";

export async function GET(
  _request: Request,
  context: { params: Promise<{ enrollmentId: string; documentId: string }> },
) {
  const denied = await requireCoursePermission(
    "enroll",
    "manage-own-enrollments",
    "manage-enrollments",
    "manage-any-enrollments",
  );
  if (denied) return denied;
  const { enrollmentId, documentId } = await context.params;
  if (
    !/^[1-9]\d*$/.test(enrollmentId) ||
    !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(documentId)
  ) {
    return Response.json(
      { success: false, error: "Documento não encontrado." },
      { status: 404 },
    );
  }

  try {
    const response = await authorizedResponse(
      `/enroll/enrollments/${enrollmentId}/documents/${documentId}/download`,
    );
    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null);
      const message =
        body && typeof body === "object" &&
        typeof (body as Record<string, unknown>).error === "string"
          ? String((body as Record<string, unknown>).error)
          : "Não foi possível baixar o documento.";
      return apiErrorResponse(new ApiError(response.status, message));
    }

    const headers = new Headers();
    const contentType = response.headers.get("Content-Type");
    const contentDisposition = response.headers.get("Content-Disposition");
    if (contentType) headers.set("Content-Type", contentType);
    if (contentDisposition) headers.set("Content-Disposition", contentDisposition);
    headers.set("Cache-Control", "private, no-store");
    return new Response(response.body, { status: response.status, headers });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
