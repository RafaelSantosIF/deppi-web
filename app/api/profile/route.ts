import { apiErrorResponse } from "@/lib/api";
import { authorizedRequest, readSession, writeSession } from "@/lib/session";
import type { UserProfile } from "@/lib/types";
import { validEmail } from "@/lib/validation";

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.name !== "string" ||
    body.name.trim().length < 2 ||
    !validEmail(body.email) ||
    (body.personalEmail !== undefined &&
      body.personalEmail !== "" &&
      !validEmail(body.personalEmail)) ||
    (body.personalEmail !== undefined && typeof body.personalEmail !== "string")
  ) {
    return Response.json(
      { success: false, error: "Confira os dados do perfil." },
      { status: 400 },
    );
  }
  const phoneList = (value: unknown) =>
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.length <= 30);
  if (!phoneList(body.personalPhones) || !phoneList(body.institutionalPhones)) {
    return Response.json(
      { success: false, error: "Confira os telefones informados." },
      { status: 400 },
    );
  }
  try {
    const profile = await authorizedRequest<UserProfile>("/users/me", {
      method: "PATCH",
      body: JSON.stringify({
        name: body.name.trim(),
        email: body.email.trim(),
        ...(body.personalEmail?.trim()
          ? { personalEmail: body.personalEmail.trim() }
          : {}),
        personalPhones: body.personalPhones,
        institutionalPhones: body.institutionalPhones,
      }),
    });
    const session = await readSession();
    if (session) {
      await writeSession({
        ...session,
        user: { ...session.user, name: profile.name, email: profile.email },
      });
    }
    return Response.json({ success: true, data: profile });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
