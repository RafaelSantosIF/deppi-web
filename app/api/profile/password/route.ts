import { apiErrorResponse } from "@/lib/api";
import { authorizedRequest, clearSession } from "@/lib/session";

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  if (
    !body?.currentPassword ||
    typeof body.newPassword !== "string" ||
    body.newPassword.length < 8 ||
    body.newPassword !== body.confirmPassword
  ) {
    return Response.json(
      {
        success: false,
        error: "Confira a senha atual e a confirmação da nova senha.",
      },
      { status: 400 },
    );
  }
  try {
    await authorizedRequest("/users/me/password", {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
        confirmPassword: body.confirmPassword,
      }),
    });
    await clearSession();
    return Response.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
