import { apiErrorResponse } from "@/lib/api";
import { getCourseMaterialAccess } from "@/lib/course-material-access";
import { authorizedRequest } from "@/lib/session";

const approvedCourseStatuses = new Set(["APPROVED", "PUBLISHED", "CLOSED"]);

async function routeContext(
  context: { params: Promise<{ id: string }> },
): Promise<
  | { denied: Response }
  | { id: string; course: Record<string, unknown> }
> {
  const { id } = await context.params;
  if (!/^[1-9]\d*$/.test(id)) {
    return {
      denied: Response.json(
        { success: false, error: "Curso não encontrado." },
        { status: 404 },
      ),
    };
  }
  const access = await getCourseMaterialAccess(id);
  if ("denied" in access) return { denied: access.denied };
  if (!access.isStaff || !access.course) {
    return {
      denied: Response.json(
        { success: false, error: "Você não pode gerenciar os materiais deste curso." },
        { status: 403 },
      ),
    };
  }
  return { id, course: access.course };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const route = await routeContext(context);
    if ("denied" in route) return route.denied;
    const data = await authorizedRequest<unknown>(`/courses/${route.id}/files`);
    return Response.json({ success: true, data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const route = await routeContext(context);
    if ("denied" in route) return route.denied;
    if (!approvedCourseStatuses.has(String(route.course.status ?? ""))) {
      return Response.json(
        { success: false, error: "Os materiais ficam disponíveis após a aprovação do curso." },
        { status: 409 },
      );
    }

    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    if (!file || typeof file === "string" || file.size === 0) {
      return Response.json(
        { success: false, error: "Selecione um arquivo válido para enviar." },
        { status: 400 },
      );
    }

    const payload = new FormData();
    payload.set("file", file);
    const data = await authorizedRequest<unknown>(`/courses/${route.id}/files`, {
      method: "POST",
      body: payload,
    });
    return Response.json({ success: true, data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
