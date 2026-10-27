import { apiErrorResponse } from "@/lib/api";
import { authorizedRequest } from "@/lib/session";

export async function GET() {
  try {
    return Response.json({ success: true, data: await authorizedRequest<unknown>("/roles") });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim().length < 2) {
    return Response.json({ success: false, error: "Informe um nome válido para o cargo." }, { status: 400 });
  }
  try {
    const data = await authorizedRequest<unknown>("/roles", {
      method: "POST",
      body: JSON.stringify({ name: body.name.trim() }),
    });
    return Response.json({ success: true, data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
