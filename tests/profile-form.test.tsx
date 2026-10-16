import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ProfileForms } from "@/components/profile-forms";
import type { UserProfile } from "@/lib/types";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));

const profile: UserProfile = {
  id: 7,
  name: "Maria da Silva",
  email: "maria@ifce.edu.br",
  personalEmail: null,
  institutionalPhones: [],
  personalPhones: [],
  role: { id: 3, name: "Aluno" },
  photoId: null,
  personalData: {
    cpf: "52998224725",
    fullName: "Maria da Silva",
    address: "Não informado",
  },
};

beforeEach(() => {
  replace.mockReset();
  refresh.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("autogestão do perfil", () => {
  it("envia dados gerais e telefones em campos separados", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<ProfileForms profile={profile} />);
    fireEvent.change(screen.getByLabelText("Nome"), {
      target: { value: "Maria Atualizada" },
    });
    fireEvent.change(screen.getByLabelText("E-mail da conta"), {
      target: { value: "maria.nova@ifce.edu.br" },
    });
    fireEvent.change(screen.getByLabelText("Telefones pessoais"), {
      target: { value: "79999999999, 79888888888" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar dados" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe("/api/profile");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).personalPhones).toEqual([
      "79999999999",
      "79888888888",
    ]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).email).toBe(
      "maria.nova@ifce.edu.br",
    );
  });

  it("altera a senha e exige novo login", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ success: true }) }),
    );
    render(<ProfileForms profile={profile} />);
    fireEvent.change(screen.getByLabelText("Senha atual"), {
      target: { value: "senhaAntiga123" },
    });
    fireEvent.change(screen.getByLabelText("Nova senha"), {
      target: { value: "senhaNova123" },
    });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), {
      target: { value: "senhaNova123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Alterar senha" }));
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/login?password=1"),
    );
  });

  it("salva o endereço pelo endpoint próprio", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<ProfileForms profile={profile} />);
    fireEvent.change(screen.getByLabelText("Endereço completo"), {
      target: { value: "Rua Central, 123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar endereço" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe("/api/profile/address");
  });

  it("envia a foto no campo aceito pela API", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<ProfileForms profile={profile} />);
    const file = new File(["image"], "foto.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Escolher imagem"), {
      target: { files: [file] },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Enviar foto" }).closest("form")!,
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe("/api/profile/photo");
    expect(fetchMock.mock.calls[0][1].body.get("photo")).toBe(file);
  });

  it("leva para 403 quando a API nega uma edição", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: "Sem permissão." }),
      }),
    );
    render(<ProfileForms profile={profile} />);
    fireEvent.click(screen.getByRole("button", { name: "Salvar dados" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/403"));
  });
});
