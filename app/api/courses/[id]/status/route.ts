import { apiErrorResponse } from "@/lib/api";
import { getCourseRecord, requireCoursePermission } from "@/lib/course-api";
import { courseStatusActions } from "@/lib/course-permissions";
import { can } from "@/lib/permissions";
import { authorizedRequest, readSession } from "@/lib/session";

const statuses = [
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "PUBLISHED",
  "CLOSED",
] as const;

export async function PATCH(
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
  const body: unknown = await request.json().catch(() => null);
  if (
    !body ||
    typeof body !== "object" ||
    !("status" in body) ||
    typeof body.status !== "string" ||
    !statuses.includes(body.status as (typeof statuses)[number]) ||
    ("reason" in body && typeof body.reason !== "string")
  ) {
    return Response.json(
      { success: false, error: "Informe uma situação válida para o curso." },
      { status: 400 },
    );
  }
  try {
    const session = await readSession();
    if (!session) {
      return Response.json(
        { success: false, error: "Sessão encerrada. Entre novamente." },
        { status: 401 },
      );
    }
    const course = await getCourseRecord(id);
    if (!course) {
      return Response.json({ success: false, error: "Curso não encontrado." }, { status: 404 });
    }
    const canManage = can(session.user, "manage-courses");
    const isOwner = Number(course.responsibleId) === session.user.id;
    const allowedStatuses = courseStatusActions(
      String(course.status ?? ""),
      canManage,
      isOwner,
    );
    if (!allowedStatuses.includes(body.status)) {
      return Response.json(
        { success: false, error: "Você não pode alterar o curso para esta situação." },
        { status: 403 },
      );
    }
    const data = await authorizedRequest<unknown>(`/courses/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return Response.json({ success: true, data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
