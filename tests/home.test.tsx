import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { getCurrentUser, pageRequest } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  pageRequest: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ getCurrentUser, pageRequest }));
vi.mock("@/lib/api", () => ({ ApiError: class extends Error {} }));

import HomePage from "@/app/(app)/inicio/page";
import { ApiError } from "@/lib/api";

const user = (permissions: string[]) => ({
  id: 1,
  name: "Ana Silva",
  email: "ana@ifce.edu.br",
  role: "Aluno",
  permissions,
});

beforeEach(() => {
  getCurrentUser.mockReset();
  pageRequest.mockReset();
});

describe("Início por permissão", () => {
  it("mostra totais reais do dashboard ao DEPPI", async () => {
    getCurrentUser.mockResolvedValue(user(["view-dashboard"]));
    pageRequest.mockResolvedValue({
      summary: {
        totalUsers: 20,
        totalCourses: 4,
        totalTeamMembers: 12,
        activeCourses: 2,
        finishedCourses: 1,
        totalInstitutions: 7,
      },
      charts: {
        usersByRole: [
          { role: "Aluno", total: 15 },
          { role: "Professor", total: 3 },
        ],
        enrollmentsByCourse: [
          {
            courseId: 1,
            title: "Introdução à extensão",
            enrolled: 12,
            maxBeneficiaries: 20,
          },
        ],
      },
      recentActivity: [],
    });
    const html = renderToStaticMarkup(await HomePage());
    expect(pageRequest).toHaveBeenCalledWith("/dashboard", "/inicio");
    expect(html).toContain("Inscrições");
    expect(html).toContain("Usuários");
    expect(html).toContain("Alunos");
    expect(html).toContain("Instituições");
    expect(html).toContain("Cursos por situação");
    expect(html).toContain("Introdução à extensão");
    expect(html).toContain(">12<");
    expect(html).toContain(">3<");
    expect(html).toContain(">7<");
  });

  it("mostra cursos publicados e inscrições próprias ao aluno", async () => {
    getCurrentUser.mockResolvedValue(user(["view-courses", "enroll"]));
    pageRequest.mockImplementation((path: string) =>
      path.startsWith("/courses")
        ? Promise.resolve([
            {
              id: 9,
              title: "Introdução a Python",
              campus: "Fortaleza",
              status: "PUBLISHED",
              startDate: "2026-11-01",
              executionHours: 40,
            },
          ])
        : Promise.resolve([
            {
              id: 3,
              status: "APPROVED",
              course: { id: 9, title: "Introdução a Python" },
            },
          ]),
    );
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain("Introdução a Python");
    expect(html).toContain("Minhas inscrições");
    expect(html).toContain("Aprovado");
  });

  it("mostra estado genérico sem buscar dados não autorizados", async () => {
    getCurrentUser.mockResolvedValue(user([]));
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain("Bem-vindo ao DEPPI");
    expect(pageRequest).not.toHaveBeenCalled();
  });

  it("mostra falha quando a API do dashboard está indisponível", async () => {
    getCurrentUser.mockResolvedValue(user(["view-dashboard"]));
    pageRequest.mockRejectedValue(new ApiError(503, "API indisponível"));
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain("Não foi possível carregar os dados");
  });
});
