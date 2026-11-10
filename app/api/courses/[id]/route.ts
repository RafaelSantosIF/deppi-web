import { apiErrorResponse } from "@/lib/api";
import {
  getCourseRecord,
  isRegisteredCourseInstitution,
  requireCoursePermission,
  validCoursePayload,
} from "@/lib/course-api";
import { canAssignCourseResponsible } from "@/lib/course-permissions";
import { can } from "@/lib/permissions";
import { authorizedRequest, readSession } from "@/lib/session";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const denied = await requireCoursePermission(
    "view-courses",
    "manage-courses",
    "create-course",
    "edit-own-course",
  );
  if (denied) return denied;
  const { id } = await context.params;
  if (!/^[1-9]\d*$/.test(id)) {
    return Response.json({ success: false, error: "Curso não encontrado." }, { status: 404 });
  }
  try {
    const data = await authorizedRequest<unknown>(`/courses/${id}`);
    const root = data && typeof data === "object"
      ? (data as Record<string, unknown>)
      : {};
    const course = root.course && typeof root.course === "object"
      ? root.course as Record<string, unknown>
      : root;
    const session = await readSession();
    const canManage = session && can(session.user, "manage-courses", "edit-any-course");
    const isOwner = session && Number(course.responsibleId) === session.user.id;
    if (
      !canManage &&
      !isOwner &&
      course.status !== "PUBLISHED"
    ) {
      return Response.json({ success: false, error: "Curso não encontrado." }, { status: 404 });
    }
    return Response.json({ success: true, data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(
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
  if (!validCoursePayload(body)) {
    return Response.json(
      { success: false, error: "Preencha corretamente os dados obrigatórios do curso." },
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
  const payload = {
    ...body,
    responsibleId: canAssignCourseResponsible(session.user)
      ? body.responsibleId
      : session.user.id,
  };
  try {
    const current = await getCourseRecord(id);
    if (!current) {
      return Response.json({ success: false, error: "Curso não encontrado." }, { status: 404 });
    }
    const canManage = can(session.user, "manage-courses", "edit-any-course");
    if (!canManage && Number(current.responsibleId) !== session.user.id) {
      return Response.json({ success: false, error: "Você não pode editar este curso." }, { status: 403 });
    }
    if (!canManage && current.status === "PENDING_APPROVAL") {
      return Response.json(
        { success: false, error: "O curso não pode ser editado enquanto aguarda avaliação." },
        { status: 409 },
      );
    }
    if (!(await isRegisteredCourseInstitution(body.campus))) {
      return Response.json(
        { success: false, error: "Selecione uma instituição cadastrada." },
        { status: 400 },
      );
    }
    const data = await authorizedRequest<unknown>(`/courses/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return Response.json({ success: true, data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const denied = await requireCoursePermission(
    "manage-courses",
    "delete-any-course",
    "delete-own-course",
  );
  if (denied) return denied;
  const { id } = await context.params;
  if (!/^[1-9]\d*$/.test(id)) {
    return Response.json({ success: false, error: "Curso não encontrado." }, { status: 404 });
  }
  try {
    await authorizedRequest(`/courses/${id}`, { method: "DELETE" });
    return Response.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
