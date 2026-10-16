import { NextRequest, NextResponse } from "next/server";
import { clearSession, readSession, refreshSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next");
  const safeNext =
    next?.startsWith("/") && !next.startsWith("//") ? next : "/inicio";
  const session = await readSession();
  if (session) {
    try {
      await refreshSession(session);
      return NextResponse.redirect(new URL(safeNext, request.url));
    } catch {
      await clearSession();
    }
  }
  return NextResponse.redirect(new URL("/login?expired=1", request.url));
}
