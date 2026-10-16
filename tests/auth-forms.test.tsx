import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { LoginForm } from "@/components/login-form";
import { RegisterForm } from "@/components/register-form";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
  useSearchParams: () => new URLSearchParams(),
}));

beforeEach(() => {
  replace.mockReset();
  refresh.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("autenticação", () => {
  it("mostra erro de credenciais sem navegar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "E-mail ou senha incorretos." }),
      }),
    );
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "aluna@ifce.edu.br" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "incorreta" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "E-mail ou senha incorretos.",
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("cadastra aluno em duas etapas e encaminha ao login", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText("Nome completo"), {
      target: { value: "Maria da Silva" },
    });
    fireEvent.change(screen.getByLabelText("CPF"), {
      target: { value: "52998224725" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));
    expect(await screen.findByLabelText("E-mail")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "maria@ifce.edu.br" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "senhaSegura123" },
    });
    fireEvent.change(screen.getByLabelText("Confirmar senha"), {
      target: { value: "senhaSegura123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Criar conta/ }));
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/login?registered=1"),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).cpf).toBe("52998224725");
  });

  it("recusa CPF inválido antes de avançar", async () => {
    render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText("Nome completo"), {
      target: { value: "Maria da Silva" },
    });
    fireEvent.change(screen.getByLabelText("CPF"), {
      target: { value: "11111111111" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("CPF inválido");
    expect(screen.queryByLabelText("E-mail")).not.toBeInTheDocument();
  });
});
