import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement } from "react";

const { requireSession, pageRequest } = vi.hoisted(() => ({
  requireSession: vi.fn(),
  pageRequest: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
vi.mock("@/lib/session", () => ({ requireSession, pageRequest }));

import CourseMaterialsPage from "@/app/(app)/cursos/[id]/materiais/page";

beforeEach(() => {
  requireSession.mockReset();
  pageRequest.mockReset();
  requireSession.mockResolvedValue({
    user: {
      id: 21,
      name: "Ana Souza",
      email: "ana@ifce.edu.br",
      role: "Aluno",
      permissions: ["enroll"],
    },
  });
});

describe("página de materiais do curso", () => {
  it("não carrega os materiais se o aluno ainda não foi aprovado", async () => {
    pageRequest.mockResolvedValue([
      {
        id: 14,
        status: "PENDING",
        course: { id: 8, title: "Curso" },
      },
    ]);

    await expect(
      CourseMaterialsPage({ params: Promise.resolve({ id: "8" }) }),
    ).rejects.toThrow("NOT_FOUND");
    expect(pageRequest).toHaveBeenCalledOnce();
  });

  it("carrega a biblioteca para inscrição aprovada", async () => {
    pageRequest
      .mockResolvedValueOnce([
        {
          id: 14,
          status: "APPROVED",
          course: { id: 8, title: "Curso" },
        },
      ])
      .mockResolvedValueOnce({
        files: [{ id: "file-1", fileName: "slides.pdf" }],
      });

    const page = await CourseMaterialsPage({
      params: Promise.resolve({ id: "8" }),
    });

    expect(isValidElement(page)).toBe(true);
    expect(pageRequest).toHaveBeenNthCalledWith(
      2,
      "/courses/8/files",
      "/cursos/8/materiais",
    );
  });
});
