import { apiErrorResponse, apiRequest } from "@/lib/api";
import { writeSession } from "@/lib/session";
import { normalizePermissions } from "@/lib/permissions";
import { validEmail } from "@/lib/validation";
import type { SessionUser } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (
    !body ||
    !validEmail(body.email) ||
    typeof body.password !== "string" ||
    !body.password
  ) {
    return Response.json(
      { success: false, error: "Informe um e-mail válido e a senha." },
      { status: 400 },
    );
  }
  try {
    const result = await apiRequest<{
      accessToken: string;
      refreshToken: string;
      user: SessionUser;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: body.email, password: body.password }),
    });
    await writeSession({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: {
        ...result.user,
        id: Number(result.user.id),
        permissions: normalizePermissions(result.user.permissions),
      },
    });
    return Response.json({ success: true, data: { redirect: "/inicio" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
