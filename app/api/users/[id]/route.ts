import { apiErrorResponse } from "@/lib/api";
import { authorizedRequest } from "@/lib/session";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim().length < 2 ||
      typeof body.email !== "string" || !body.email.includes("@") ||
      !Number.isInteger(body.roleId) ||
      (body.registration !== undefined &&
        (typeof body.registration !== "string" || body.registration.length > 20))) {
    return Response.json({ success: false, error: "Preencha nome, e-mail e cargo corretamente." }, { status: 400 });
  }
  try {
    const data = await authorizedRequest<unknown>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...body,
        name: body.name.trim(),
        email: body.email.trim(),
        ...(typeof body.registration === "string"
          ? { registration: body.registration.trim() }
          : {}),
      }),
    });
    if (
      typeof body.registration === "string" &&
      body.registration.trim() &&
      (!data ||
        typeof data !== "object" ||
        (data as Record<string, unknown>).registration !== body.registration.trim())
    ) {
      return Response.json(
        {
          success: false,
          error: "A API não confirmou a atualização da matrícula. Tente novamente.",
        },
        { status: 502 },
      );
    }
    return Response.json({ success: true, data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await authorizedRequest(`/users/${id}`, { method: "DELETE" });
    return Response.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
