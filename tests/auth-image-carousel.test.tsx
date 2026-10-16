import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthImageCarousel } from "@/components/auth-image-carousel";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("imagens da tela de login", () => {
  it("exibe uma imagem por vez e alterna depois de um minuto", () => {
    vi.useFakeTimers();
    const { container } = render(<AuthImageCarousel />);

    expect(container.querySelectorAll(".auth-photo-active")).toHaveLength(1);
    expect(container.querySelector(".auth-photo-active")).toHaveAttribute(
      "src",
      expect.stringContaining("login_screen1.jpg"),
    );

    act(() => vi.advanceTimersByTime(60_000));

    expect(container.querySelectorAll(".auth-photo-active")).toHaveLength(1);
    expect(container.querySelector(".auth-photo-active")).toHaveAttribute(
      "src",
      expect.stringContaining("login_screen2.jpg"),
    );
  });

  it("mantém a primeira imagem quando o movimento reduzido está ativo", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const { container } = render(<AuthImageCarousel />);

    act(() => vi.advanceTimersByTime(120_000));

    expect(container.querySelector(".auth-photo-active")).toHaveAttribute(
      "src",
      expect.stringContaining("login_screen1.jpg"),
    );
  });
});
