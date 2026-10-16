import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiRequest, writeSession, readSession, clearSession, refreshSession } =
  vi.hoisted(() => ({
    apiRequest: vi.fn(),
    writeSession: vi.fn(),
    readSession: vi.fn(),
    clearSession: vi.fn(),
    refreshSession: vi.fn(),
  }));

vi.mock("@/lib/api", () => ({
  apiRequest,
  ApiError: class extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
  apiErrorResponse: (error: Error) =>
    Response.json({ success: false, error: error.message }, { status: 409 }),
}));
vi.mock("@/lib/session", () => ({
  writeSession,
  readSession,
  clearSession,
  refreshSession,
}));

import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as refreshRoute } from "@/app/api/auth/refresh/route";
import { POST as register } from "@/app/api/auth/register/route";
import { ApiError } from "@/lib/api";
import { NextRequest } from "next/server";

const request = (body: object) => ({ json: async () => body }) as Request;

beforeEach(() => {
  apiRequest.mockReset();
  writeSession.mockReset();
  readSession.mockReset();
  clearSession.mockReset();
  refreshSession.mockReset();
});

describe("BFF de autenticação", () => {
  it("guarda os tokens no servidor e devolve apenas a rota ao navegador", async () => {
    apiRequest.mockResolvedValue({
      accessToken: "access-secret",
      refreshToken: "refresh-secret",
      user: {
        id: "7",
        name: "Maria",
        email: "maria@ifce.edu.br",
        role: "Aluno",
        permissions: ["Visualizar Cursos"],
      },
    });
    const response = await login(
      request({ email: "maria@ifce.edu.br", password: "senhaSegura123" }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: { redirect: "/inicio" },
    });
    expect(writeSession).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: "access-secret",
        refreshToken: "refresh-secret",
        user: expect.objectContaining({ id: 7, permissions: ["view-courses"] }),
      }),
    );
  });

  it("repassa conflito de cadastro sem criar sessão", async () => {
    apiRequest.mockRejectedValue(new Error("CPF já cadastrado."));
    const response = await register(
      request({
        name: "Maria da Silva",
        email: "maria@ifce.edu.br",
        cpf: "529.982.247-25",
        password: "senhaSegura123",
        confirmPassword: "senhaSegura123",
      }),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe("CPF já cadastrado.");
    expect(writeSession).not.toHaveBeenCalled();
    expect(JSON.parse(apiRequest.mock.calls[0][1].body).cpf).toBe(
      "52998224725",
    );
  });

  it("recusa campos com tipos inesperados antes de chamar a API", async () => {
    const loginResponse = await login(
      request({ email: "maria@ifce.edu.br", password: { value: "senha" } }),
    );
    const registerResponse = await register(
      request({
        name: "Maria da Silva",
        email: "maria@ifce.edu.br",
        cpf: 52998224725,
        password: "senhaSegura123",
        confirmPassword: "senhaSegura123",
      }),
    );
    expect(loginResponse.status).toBe(400);
    expect(registerResponse.status).toBe(400);
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("renova o token vencido para revogar a sessão remota no logout", async () => {
    const session = {
      accessToken: "old",
      refreshToken: "old-refresh",
      user: { id: 7 },
    };
    readSession.mockResolvedValue(session);
    apiRequest
      .mockRejectedValueOnce(new ApiError(401, "Token expirado"))
      .mockResolvedValueOnce(undefined);
    refreshSession.mockResolvedValue({
      ...session,
      accessToken: "new",
      refreshToken: "new-refresh",
    });
    const response = await logout();
    expect(response.status).toBe(200);
    expect(apiRequest).toHaveBeenCalledTimes(2);
    expect(JSON.parse(apiRequest.mock.calls[1][1].body).refreshToken).toBe(
      "new-refresh",
    );
    expect(clearSession).toHaveBeenCalledOnce();
  });

  it("retorna à página original depois da renovação", async () => {
    readSession.mockResolvedValue({
      accessToken: "old",
      refreshToken: "refresh",
      user: { id: 7 },
    });
    refreshSession.mockResolvedValue({
      accessToken: "new",
      refreshToken: "new-refresh",
      user: { id: 7 },
    });
    const response = await refreshRoute(
      new NextRequest("http://localhost:3000/api/auth/refresh?next=/perfil"),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/perfil",
    );
    expect(refreshSession).toHaveBeenCalledOnce();
  });
});
