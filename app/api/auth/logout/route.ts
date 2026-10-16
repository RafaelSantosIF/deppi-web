import { apiRequest, ApiError } from "@/lib/api";
import { clearSession, readSession, refreshSession } from "@/lib/session";

export async function POST() {
  let session = await readSession();
  if (session) {
    try {
      await apiRequest(
        "/auth/logout",
        {
          method: "POST",
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        },
        session.accessToken,
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        try {
          session = await refreshSession(session);
          await apiRequest(
            "/auth/logout",
            {
              method: "POST",
              body: JSON.stringify({ refreshToken: session.refreshToken }),
            },
            session.accessToken,
          );
        } catch {}
      }
    }
  }
  await clearSession();
  return Response.json({ success: true });
}
