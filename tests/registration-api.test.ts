import { beforeEach, describe, expect, it, vi } from "vitest";

const { authorizedRequest, readSession, writeSession } = vi.hoisted(() => ({
  authorizedRequest: vi.fn(),
  readSession: vi.fn(),
  writeSession: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  authorizedRequest,
  readSession,
  writeSession,
}));
vi.mock("@/lib/api", () => ({
  apiErrorResponse: (error: Error) =>
    Response.json({ success: false, error: error.message }, { status: 500 }),
}));

import { PATCH as updateProfile } from "@/app/api/profile/route";
import { PATCH as updateUser } from "@/app/api/users/[id]/route";

const request = (body: object) =>
  new Request("http://localhost", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  authorizedRequest.mockReset();
  readSession.mockReset();
  writeSession.mockReset();
});

describe("atualização da matrícula", () => {
  it("salva a matrícula do aluno no perfil e atualiza a sessão", async () => {
    const profile = {
      id: 21,
      name: "Ana Souza",
      email: "ana@ifce.edu.br",
      registration: "2026001234",
    };
    authorizedRequest.mockResolvedValue(profile);
    readSession.mockResolvedValue({
      user: {
        id: 21,
        name: "Ana Souza",
        email: "ana@ifce.edu.br",
        role: "Aluno",
        permissions: ["edit-profile"],
      },
    });

    const response = await updateProfile(
      request({
        name: "Ana Souza",
        email: "ana@ifce.edu.br",
        registration: "2026001234",
        personalPhones: [],
        institutionalPhones: [],
      }),
    );

    expect(response.status).toBe(200);
    expect(
      JSON.parse(authorizedRequest.mock.calls[0][1].body).registration,
    ).toBe("2026001234");
    expect(writeSession.mock.calls[0][0].user.registration).toBe(
      "2026001234",
    );
  });

  it("não confirma a matrícula se o perfil retornado não a contém", async () => {
    authorizedRequest.mockResolvedValue({
      id: 21,
      name: "Ana Souza",
      email: "ana@ifce.edu.br",
      registration: null,
    });

    const response = await updateProfile(
      request({
        name: "Ana Souza",
        email: "ana@ifce.edu.br",
        registration: "2026001234",
        personalPhones: [],
        institutionalPhones: [],
      }),
    );

    expect(response.status).toBe(502);
    expect(writeSession).not.toHaveBeenCalled();
  });

  it("encaminha a matrícula ao editar um aluno e rejeita valores acima do limite", async () => {
    authorizedRequest.mockResolvedValue({
      id: 21,
      registration: "2026005678",
    });
    const validResponse = await updateUser(
      request({
        name: "Ana Souza",
        email: "ana@ifce.edu.br",
        roleId: 5,
        registration: "2026005678",
      }),
      { params: Promise.resolve({ id: "21" }) },
    );

    expect(validResponse.status).toBe(200);
    expect(
      JSON.parse(authorizedRequest.mock.calls[0][1].body).registration,
    ).toBe("2026005678");

    const invalidResponse = await updateUser(
      request({
        name: "Ana Souza",
        email: "ana@ifce.edu.br",
        roleId: 5,
        registration: "123456789012345678901",
      }),
      { params: Promise.resolve({ id: "21" }) },
    );
    expect(invalidResponse.status).toBe(400);
    expect(authorizedRequest).toHaveBeenCalledOnce();
  });

  it("não confirma a atualização quando a API não retorna a matrícula salva", async () => {
    authorizedRequest.mockResolvedValue({
      id: 21,
      registration: "2026001234",
    });

    const response = await updateUser(
      request({
        name: "Ana Souza",
        email: "ana@ifce.edu.br",
        roleId: 5,
        registration: "2026005678",
      }),
      { params: Promise.resolve({ id: "21" }) },
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      success: false,
      error: expect.stringContaining("não confirmou"),
    });
  });
});
