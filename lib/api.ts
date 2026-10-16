import "server-only";
import type { ApiResponse } from "./types";

const baseUrl = process.env.DEPPI_API_URL ?? "https://deppi-api.onrender.com";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData))
    headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ApiError(
      503,
      "A API está indisponível no momento. Tente novamente.",
    );
  }

  if (response.status === 204) return undefined as T;
  let body: ApiResponse<T>;
  try {
    body = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError(502, "A API retornou uma resposta inesperada.");
  }
  if (!response.ok || !body.success) {
    const detail =
      !body.success && typeof body.error === "string"
        ? body.error
        : "Não foi possível concluir a operação.";
    throw new ApiError(response.status, detail);
  }
  return body.data;
}

export function apiErrorResponse(error: unknown) {
  const status = error instanceof ApiError ? error.status : 500;
  const message =
    error instanceof ApiError
      ? error.message
      : "Não foi possível concluir a operação.";
  return Response.json({ success: false, error: message }, { status });
}
