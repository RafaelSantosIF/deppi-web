import { apiErrorResponse } from "@/lib/api";
import { authorizedRequest } from "@/lib/session";

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  if (typeof body?.address !== "string" || body.address.trim().length < 3) {
    return Response.json(
      { success: false, error: "Informe um endereço válido." },
      { status: 400 },
    );
  }
  try {
    await authorizedRequest("/users/me/address", {
      method: "PATCH",
      body: JSON.stringify({ address: body.address.trim() }),
    });
    return Response.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
