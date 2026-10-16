import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiRequest, ApiError } from "./api";
import { normalizePermissions } from "./permissions";
import type { Session, SessionUser, UserProfile } from "./types";

const COOKIE_NAME = "deppi_session";
const COOKIE_AGE = 30 * 24 * 60 * 60;

function key() {
  const secret = process.env.DEPPI_SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error(
      "DEPPI_SESSION_SECRET precisa ter pelo menos 32 caracteres.",
    );
  return createHash("sha256").update(secret).digest();
}

function seal(session: Session) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(session)),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
    "base64url",
  );
}

function unseal(value: string): Session | null {
  try {
    const buffer = Buffer.from(value, "base64url");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key(),
      buffer.subarray(0, 12),
    );
    decipher.setAuthTag(buffer.subarray(12, 28));
    const session = JSON.parse(
      Buffer.concat([
        decipher.update(buffer.subarray(28)),
        decipher.final(),
      ]).toString(),
    );
    if (!session?.accessToken || !session?.refreshToken || !session?.user?.id)
      return null;
    return session as Session;
  } catch {
    return null;
  }
}

export async function readSession() {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  return value ? unseal(value) : null;
}

export async function writeSession(session: Session) {
  (await cookies()).set(COOKIE_NAME, seal(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_AGE,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE_NAME);
}

export async function requireSession() {
  const session = await readSession();
  if (!session) redirect("/login");
  return session;
}

export async function refreshSession(session: Session) {
  const tokens = await apiRequest<{
    accessToken: string;
    refreshToken: string;
  }>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });
  let user = session.user;
  try {
    const payload = JSON.parse(
      Buffer.from(tokens.accessToken.split(".")[1], "base64url").toString(),
    );
    if (Number(payload.id) === session.user.id) {
      user = {
        id: session.user.id,
        name:
          typeof payload.name === "string" ? payload.name : session.user.name,
        email:
          typeof payload.email === "string"
            ? payload.email
            : session.user.email,
        role:
          typeof payload.role === "string" ? payload.role : session.user.role,
        permissions: normalizePermissions(payload.permissions),
      };
    }
  } catch {
    user = session.user;
  }
  const refreshed = {
    user,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
  await writeSession(refreshed);
  return refreshed;
}

export async function authorizedRequest<T>(
  path: string,
  init: RequestInit = {},
) {
  let session = await readSession();
  if (!session) throw new ApiError(401, "Sessão encerrada. Entre novamente.");
  try {
    return await apiRequest<T>(path, init, session.accessToken);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    try {
      session = await refreshSession(session);
    } catch {
      await clearSession();
      throw new ApiError(401, "Sessão encerrada. Entre novamente.");
    }
    return await apiRequest<T>(path, init, session.accessToken);
  }
}

export async function pageRequest<T>(
  path: string,
  returnTo: string,
): Promise<T> {
  const session = await requireSession();
  try {
    return await apiRequest<T>(path, {}, session.accessToken);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(`/api/auth/refresh?next=${encodeURIComponent(returnTo)}`);
    }
    if (error instanceof ApiError && error.status === 403) redirect("/403");
    throw error;
  }
}

export async function getCurrentUser(
  returnTo = "/inicio",
): Promise<SessionUser> {
  const session = await requireSession();
  const profile = await pageRequest<UserProfile>("/users/me", returnTo);
  return {
    ...session.user,
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role.name,
    permissions: normalizePermissions(session.user.permissions),
  };
}
