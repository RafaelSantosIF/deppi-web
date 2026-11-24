import { apiErrorResponse } from "@/lib/api";
import { authorizedRequest } from "@/lib/session";

export async function GET() {
  try {
    return Response.json({ success: true, data: await authorizedRequest<unknown>("/users") });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim().length < 2 ||
      typeof body.email !== "string" || !body.email.includes("@") ||
      typeof body.password !== "string" || body.password.length < 8 ||
      !Number.isInteger(body.roleId) ||
      (body.registration !== undefined &&
        (typeof body.registration !== "string" || body.registration.length > 20))) {
    return Response.json({ success: false, error: "Preencha nome, e-mail, senha e cargo corretamente." }, { status: 400 });
  }
  try {
    const data = await authorizedRequest<unknown>("/users", {
      method: "POST",
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
          error: "A API não confirmou a gravação da matrícula. Tente novamente.",
        },
        { status: 502 },
      );
    }
    return Response.json({ success: true, data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
