import { apiErrorResponse } from "@/lib/api";
import {
  isRegisteredCourseInstitution,
  requireCoursePermission,
  validCoursePayload,
} from "@/lib/course-api";
import { canAssignCourseResponsible } from "@/lib/course-permissions";
import { authorizedRequest, readSession } from "@/lib/session";

export async function GET(request: Request) {
  const denied = await requireCoursePermission(
    "view-courses",
    "manage-courses",
    "create-course",
    "edit-own-course",
  );
  if (denied) return denied;
  const search = new URL(request.url).searchParams;
  const session = await readSession();
  const query = search.size ? `?${search.toString()}` : "";
  try {
    const data = await authorizedRequest<unknown>(`/courses${query}`);
    if (!session || session.user.permissions.includes("manage-courses")) {
      return Response.json({ success: true, data });
    }
    const root = data && typeof data === "object"
      ? data as Record<string, unknown>
      : {};
    const source = Array.isArray(data)
      ? data
      : Array.isArray(root.courses)
        ? root.courses
        : null;
    if (!source) {
      return Response.json(
        { success: false, error: "A API retornou uma lista de cursos inválida." },
        { status: 502 },
      );
    }
    const courses = source.filter((course) => {
      if (!course || typeof course !== "object") return false;
      const item = course as Record<string, unknown>;
      return (
        item.status === "PUBLISHED" ||
        Number(item.responsibleId) === session.user.id
      );
    });
    return Response.json({ success: true, data: courses });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const denied = await requireCoursePermission("create-course", "manage-courses");
  if (denied) return denied;
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
    if (!(await isRegisteredCourseInstitution(body.campus))) {
      return Response.json(
        { success: false, error: "Selecione uma instituição cadastrada." },
        { status: 400 },
      );
    }
    const data = await authorizedRequest<unknown>("/courses", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return Response.json({ success: true, data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
