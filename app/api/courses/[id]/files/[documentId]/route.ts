import { apiErrorResponse } from "@/lib/api";
import { getCourseMaterialAccess } from "@/lib/course-material-access";
import { isCourseMaterialId } from "@/lib/course-materials";
import { authorizedRequest } from "@/lib/session";

const approvedCourseStatuses = new Set(["APPROVED", "PUBLISHED", "CLOSED"]);

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; documentId: string }> },
) {
  const { id, documentId } = await context.params;
  if (!/^[1-9]\d*$/.test(id) || !isCourseMaterialId(documentId)) {
    return Response.json(
      { success: false, error: "Arquivo não encontrado." },
      { status: 404 },
    );
  }

  try {
    const access = await getCourseMaterialAccess(id);
    if ("denied" in access) return access.denied;
    if (!access.isStaff) {
      return Response.json(
        { success: false, error: "Você não pode remover este material." },
        { status: 403 },
      );
    }
    if (!approvedCourseStatuses.has(String(access.course.status ?? ""))) {
      return Response.json(
        { success: false, error: "Você não pode remover este material." },
        { status: 403 },
      );
    }
    await authorizedRequest(`/courses/${id}/files/${documentId}`, {
      method: "DELETE",
    });
    return Response.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
