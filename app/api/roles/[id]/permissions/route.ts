import { apiErrorResponse } from "@/lib/api";
import { authorizedRequest } from "@/lib/session";

async function mutatePermissions(request: Request, context: { params: Promise<{ id: string }> }, method: "PUT" | "POST" | "DELETE", bodyKey?: "permissionIds" | "permissionId") {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const sanitizedBody = bodyKey === "permissionIds"
    ? {
        permissionIds: Array.isArray(body?.permissionIds)
          ? [...new Set(body.permissionIds.filter((permissionId: unknown) => typeof permissionId === "number" && Number.isInteger(permissionId) && permissionId > 0))]
          : null,
      }
    : body && { permissionId: body.permissionId };

  if (bodyKey === "permissionIds") {
    if (!sanitizedBody.permissionIds) {
      return Response.json({ success: false, error: "Seleção de permissões inválida." }, { status: 400 });
    }
  } else if (!sanitizedBody || !Number.isInteger(sanitizedBody.permissionId)) {
    return Response.json({ success: false, error: "Seleção de permissões inválida." }, { status: 400 });
  }
  try {
    const data = await authorizedRequest<unknown>(`/roles/${id}/permissions`, {
      method,
      body: JSON.stringify(sanitizedBody),
    });
    return Response.json({ success: true, data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export function PUT(request: Request, context: { params: Promise<{ id: string }> }) { return mutatePermissions(request, context, "PUT", "permissionIds"); }
export function POST(request: Request, context: { params: Promise<{ id: string }> }) { return mutatePermissions(request, context, "POST", "permissionId"); }
export function DELETE(request: Request, context: { params: Promise<{ id: string }> }) { return mutatePermissions(request, context, "DELETE", "permissionId"); }
