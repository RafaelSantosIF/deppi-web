import { apiErrorResponse } from "@/lib/api";
import { authorizedRequest, readSession, refreshSession } from "@/lib/session";

export async function GET() {
  let session = await readSession();
  if (!session) return new Response(null, { status: 401 });
  try {
    const imageUrl = `${process.env.DEPPI_API_URL ?? "https://deppi-api.onrender.com"}/users/${session.user.id}/photo`;
    const fetchPhoto = (token: string) =>
      fetch(imageUrl, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
    let response = await fetchPhoto(session.accessToken);
    if (response.status === 401) {
      session = await refreshSession(session);
      response = await fetchPhoto(session.accessToken);
    }
    if (!response.ok) return new Response(null, { status: response.status });
    return new Response(response.body, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "image/jpeg",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}

export async function POST(request: Request) {
  const session = await readSession();
  if (!session)
    return Response.json(
      { success: false, error: "Sessão encerrada." },
      { status: 401 },
    );
  const form = await request.formData().catch(() => null);
  if (!form)
    return Response.json(
      { success: false, error: "Arquivo inválido." },
      { status: 400 },
    );
  const photo = form.get("photo");
  if (
    !(photo instanceof File) ||
    !["image/jpeg", "image/png", "image/webp"].includes(photo.type) ||
    photo.size > 3 * 1024 * 1024
  ) {
    return Response.json(
      { success: false, error: "Envie JPEG, PNG ou WebP de até 3 MB." },
      { status: 400 },
    );
  }
  try {
    const outgoing = new FormData();
    outgoing.set("photo", photo);
    await authorizedRequest(`/users/${session.user.id}/photo`, {
      method: "POST",
      body: outgoing,
    });
    return Response.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE() {
  const session = await readSession();
  if (!session)
    return Response.json(
      { success: false, error: "Sessão encerrada." },
      { status: 401 },
    );
  try {
    await authorizedRequest(`/users/${session.user.id}/photo`, {
      method: "DELETE",
    });
    return Response.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
