import { ApiError, apiErrorResponse } from "@/lib/api";
import { getCourseMaterialAccess } from "@/lib/course-material-access";
import { isCourseMaterialId } from "@/lib/course-materials";
import { authorizedResponse } from "@/lib/session";

export async function GET(
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
    const response = await authorizedResponse(
      `/courses/${id}/files/${documentId}/download`,
    );
    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null);
      const message =
        body &&
        typeof body === "object" &&
        typeof (body as Record<string, unknown>).error === "string"
          ? String((body as Record<string, unknown>).error)
          : "Não foi possível baixar o material.";
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
