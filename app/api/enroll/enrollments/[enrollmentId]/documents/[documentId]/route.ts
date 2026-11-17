import { apiErrorResponse } from "@/lib/api";
import { requireCoursePermission } from "@/lib/course-api";
import { authorizedRequest } from "@/lib/session";

export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{ enrollmentId: string; documentId: string }>;
  },
) {
  const denied = await requireCoursePermission(
    "enroll",
    "manage-own-enrollments",
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
    await authorizedRequest(
      `/enroll/enrollments/${enrollmentId}/documents/${documentId}`,
      { method: "DELETE" },
    );
    return Response.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
