import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { authorizedRequest, requireSession, redirect } = vi.hoisted(() => ({
  authorizedRequest: vi.fn(),
  requireSession: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/session", () => ({ authorizedRequest, requireSession }));
vi.mock("@/lib/api", () => ({
  ApiError: class extends Error {
    constructor(public status: number, message: string) {
      super(message);
    }
  },
}));
vi.mock("next/navigation", () => ({ redirect }));

import CoursesPage from "@/app/(app)/cursos/page";
import { ApiError } from "@/lib/api";

const professor = {
  id: 7,
  name: "Paulo",
  email: "paulo@ifce.edu.br",
  role: "Professor",
  permissions: ["view-courses", "create-course", "edit-own-course"],
};

beforeEach(() => {
  authorizedRequest.mockReset();
  requireSession.mockReset();
  redirect.mockClear();
});

describe("acesso de professor à página de cursos", () => {
  it("não redireciona quando o professor não tem acesso administrativo às instituições", async () => {
    requireSession.mockResolvedValue({ user: professor });
    authorizedRequest.mockImplementation((path: string) => {
      if (path === "/courses") {
        return Promise.resolve([
          {
            id: 9,
            title: "Curso do professor",
            campus: "Campus Fortaleza",
            status: "DRAFT",
            responsibleId: professor.id,
            startDate: "2026-11-10",
            endDateEstimated: "2026-12-10",
            executionHours: 40,
            maxBeneficiaries: 20,
          },
        ]);
      }
      if (path === "/institutions?active=true") {
        return Promise.reject(new ApiError(403, "Acesso negado."));
      }
      throw new Error(`Caminho inesperado: ${path}`);
    });

    const markup = renderToStaticMarkup(await CoursesPage());

    expect(markup).toContain("Cursos");
    expect(markup).toContain("Curso do professor");
    expect(markup).toContain(
      "A API precisa permitir GET /institutions?active=true para usuários autenticados.",
    );
    expect(authorizedRequest).toHaveBeenCalledWith(
      "/institutions?active=true",
    );
    expect(redirect).not.toHaveBeenCalled();
  });
});
