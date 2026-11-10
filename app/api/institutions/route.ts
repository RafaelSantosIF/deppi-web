import { apiErrorResponse } from "@/lib/api";
import { authorizedRequest } from "@/lib/session";

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  const query = search.get("active") === "true" ? "?active=true" : "";
  try {
    return Response.json({
      success: true,
      data: await authorizedRequest<unknown>(`/institutions${query}`),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim().length < 2 ||
      typeof body.cnpj !== "string" || body.cnpj.trim().length === 0) {
    return Response.json({ success: false, error: "Preencha o nome e o CNPJ da instituição corretamente." }, { status: 400 });
  }
  try {
    const data = await authorizedRequest<unknown>("/institutions", {
      method: "POST",
      body: JSON.stringify({ ...body, name: body.name.trim(), cnpj: body.cnpj.trim() }),
    });
    return Response.json({ success: true, data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
