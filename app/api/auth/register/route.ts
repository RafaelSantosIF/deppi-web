import { apiErrorResponse, apiRequest } from "@/lib/api";
import { validCpf, validEmail } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.name !== "string" ||
    body.name.trim().length < 2 ||
    !validEmail(body.email ?? "") ||
    !validCpf(body.cpf ?? "") ||
    typeof body.password !== "string" ||
    body.password.length < 8 ||
    body.password !== body.confirmPassword ||
    (body.registration !== undefined &&
      (typeof body.registration !== "string" || body.registration.length > 20))
  ) {
    return Response.json(
      {
        success: false,
        error: "Confira os dados informados e tente novamente.",
      },
      { status: 400 },
    );
  }
  try {
    await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: body.name.trim(),
        email: body.email.trim(),
        cpf: body.cpf.replace(/\D/g, ""),
        ...(body.registration?.trim()
          ? { registration: body.registration.trim() }
          : {}),
        password: body.password,
        confirmPassword: body.confirmPassword,
      }),
    });
    return Response.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
