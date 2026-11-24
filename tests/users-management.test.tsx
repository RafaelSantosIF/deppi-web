import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { UsersManagement } from "@/components/users-management";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("edição de aluno", () => {
  it("exibe e salva a matrícula do usuário", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return {
          ok: true,
          json: async () => ({ success: true, data: {} }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          success: true,
          data:
            url === "/api/users"
              ? [
                  {
                    id: 21,
                    name: "Ana Souza",
                    email: "ana@ifce.edu.br",
                    registration: "2026001234",
                    role: { id: 5, name: "Aluno" },
                  },
                ]
              : [{ id: 5, name: "Aluno" }],
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <UsersManagement
        initialUsers={[
          {
            id: 21,
            name: "Ana Souza",
            email: "ana@ifce.edu.br",
            registration: "2026001234",
            role: { id: 5, name: "Aluno" },
          },
        ]}
        initialRoles={[{ id: 5, name: "Aluno" }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    expect(screen.getByLabelText("Matrícula")).toHaveValue("2026001234");
    fireEvent.change(screen.getByLabelText("Matrícula"), {
      target: { value: "2026005678" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar usuário" }));

    await waitFor(() =>
      expect(screen.getByText("Usuário atualizado com sucesso.")).toBeTruthy(),
    );
    const request = fetchMock.mock.calls.find(
      ([url, init]) => url === "/api/users/21" && init?.method === "PATCH",
    );
    expect(request).toBeTruthy();
    expect(JSON.parse(request?.[1]?.body as string).registration).toBe(
      "2026005678",
    );
  });
});
