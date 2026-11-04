import { apiErrorResponse, apiRequest } from "@/lib/api";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.newPassword !== "string" ||
    body.newPassword.length < 8 ||
    body.newPassword !== body.confirmPassword ||
    typeof body.email !== "string"
  ) {
    return Response.json(
      { success: false, error: "A nova senha deve ter ao menos 8 caracteres e coincidir com a confirmação." },
      { status: 400 },
    );
  }

  try {
    const forgot = await apiRequest<{ resetToken?: string }>(
      "/auth/forgot-password",
      {
        method: "POST",
        body: JSON.stringify({ email: body.email.trim() }),
      },
    );
    if (!forgot.resetToken) {
      return Response.json(
        { success: false, error: "A API não disponibilizou o token de redefinição." },
        { status: 502 },
      );
    }
    await apiRequest("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        token: forgot.resetToken,
        password: body.newPassword,
        confirmPassword: body.confirmPassword,
      }),
    });
    return Response.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
