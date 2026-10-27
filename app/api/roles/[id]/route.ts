import { apiErrorResponse } from "@/lib/api";
import { authorizedRequest } from "@/lib/session";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim().length < 2) {
    return Response.json({ success: false, error: "Informe um nome válido para o cargo." }, { status: 400 });
  }
  try {
    const data = await authorizedRequest<unknown>(`/roles/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: body.name.trim() }),
    });
    return Response.json({ success: true, data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await authorizedRequest(`/roles/${id}`, { method: "DELETE" });
    return Response.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
