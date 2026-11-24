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
    (body.personalEmail !== undefined && typeof body.personalEmail !== "string") ||
    (body.registration !== undefined &&
      (typeof body.registration !== "string" || body.registration.length > 20))
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
    const registration =
      typeof body.registration === "string"
        ? body.registration.trim()
        : undefined;
    const profile = await authorizedRequest<UserProfile>("/users/me", {
      method: "PATCH",
      body: JSON.stringify({
        name: body.name.trim(),
        email: body.email.trim(),
        ...(body.personalEmail?.trim()
          ? { personalEmail: body.personalEmail.trim() }
          : {}),
        ...(body.registration !== undefined
          ? { registration: body.registration.trim() }
          : {}),
        personalPhones: body.personalPhones,
        institutionalPhones: body.institutionalPhones,
      }),
    });
    if (
      registration &&
      profile.registration !== registration
    ) {
      return Response.json(
        {
          success: false,
          error: "A API não confirmou a atualização da matrícula. Tente novamente.",
        },
        { status: 502 },
      );
    }
    const session = await readSession();
    if (session) {
      await writeSession({
        ...session,
        user: {
          ...session.user,
          name: profile.name,
          email: profile.email,
          registration:
            profile.registration === null
              ? ""
              : (profile.registration ?? session.user.registration),
        },
      });
    }
    return Response.json({ success: true, data: profile });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
