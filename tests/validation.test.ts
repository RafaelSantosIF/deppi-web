import { describe, expect, it } from "vitest";
import { validCpf, validEmail } from "@/lib/validation";

describe("validação do cadastro", () => {
  it("aceita CPF válido com ou sem pontuação", () => {
    expect(validCpf("52998224725")).toBe(true);
    expect(validCpf("529.982.247-25")).toBe(true);
  });

  it("recusa dígitos verificadores incorretos e sequências", () => {
    expect(validCpf("52998224726")).toBe(false);
    expect(validCpf("11111111111")).toBe(false);
  });

  it("valida o formato básico de e-mail", () => {
    expect(validEmail("aluna@ifce.edu.br")).toBe(true);
    expect(validEmail("sem-arroba")).toBe(false);
  });
});
