import { apiErrorResponse } from "@/lib/api";
import { getCourseRecord, requireCoursePermission } from "@/lib/course-api";
import { can } from "@/lib/permissions";
import { authorizedRequest, readSession } from "@/lib/session";

const MAX_COVER_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const denied = await requireCoursePermission(
    "manage-courses",
    "edit-any-course",
    "edit-own-course",
  );
  if (denied) return denied;
  const { id } = await context.params;
  if (!/^[1-9]\d*$/.test(id)) {
    return Response.json({ success: false, error: "Curso não encontrado." }, { status: 404 });
  }
  const session = await readSession();
  if (!session) {
    return Response.json(
      { success: false, error: "Sessão encerrada. Entre novamente." },
      { status: 401 },
    );
  }
  const canManage = can(session.user, "manage-courses", "edit-any-course");
  try {
    const course = await getCourseRecord(id);
    if (!course) {
      return Response.json({ success: false, error: "Curso não encontrado." }, { status: 404 });
    }
    if (!canManage && Number(course.responsibleId) !== session.user.id) {
      return Response.json({ success: false, error: "Você não pode alterar este curso." }, { status: 403 });
    }
    if (!canManage && course.status === "PENDING_APPROVAL") {
      return Response.json(
        { success: false, error: "O curso não pode ser alterado enquanto aguarda avaliação." },
        { status: 409 },
      );
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
  const formData = await request.formData();
  const cover = formData.get("cover");
  if (
    !(cover instanceof File) ||
    !IMAGE_TYPES.has(cover.type) ||
    cover.size === 0 ||
    cover.size > MAX_COVER_SIZE
  ) {
    return Response.json(
      { success: false, error: "Envie uma imagem PNG, JPG ou WebP de até 5 MB." },
      { status: 400 },
    );
  }
  const payload = new FormData();
  payload.set("cover", cover);
  try {
    const data = await authorizedRequest<unknown>(`/courses/${id}/cover`, {
      method: "POST",
      body: payload,
    });
    return Response.json({ success: true, data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
