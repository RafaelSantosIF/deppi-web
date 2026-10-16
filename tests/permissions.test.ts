import { describe, expect, it } from "vitest";
import {
  can,
  normalizePermissions,
  visibleNavigation,
} from "@/lib/permissions";
import type { SessionUser } from "@/lib/types";

const user = (permissions: string[]): SessionUser => ({
  id: 1,
  name: "Aluna",
  email: "aluna@ifce.edu.br",
  role: "Aluno",
  permissions,
});

describe("navegação por permissões", () => {
  it("normaliza rótulos e slugs da API", () => {
    expect(
      normalizePermissions([
        "Visualizar Cursos",
        "view-courses",
        "Visualizar Perfil",
      ]),
    ).toEqual(["view-courses", "view-profile"]);
  });

  it("mostra somente os módulos autorizados para aluno", () => {
    const items = visibleNavigation(
      user(["view-courses", "enroll", "view-profile"]),
    );
    expect(items.map((item) => item.label)).toEqual([
      "Início",
      "Cursos",
      "Minhas inscrições",
      "Perfil",
    ]);
    expect(items.find((item) => item.label === "Cursos")?.comingSoon).toBe(
      true,
    );
    expect(can(user(["view-courses"]), "view-dashboard")).toBe(false);
  });

  it("não concede permissões por nome do papel", () => {
    const adminWithoutPermissions = { ...user([]), role: "Administrador" };
    expect(
      visibleNavigation(adminWithoutPermissions).map((item) => item.label),
    ).toEqual(["Início", "Perfil"]);
  });
});
