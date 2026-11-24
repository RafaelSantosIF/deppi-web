import { beforeEach, describe, expect, it, vi } from "vitest";

const { readSession, authorizedRequest, getCourseRecord } = vi.hoisted(() => ({
  readSession: vi.fn(),
  authorizedRequest: vi.fn(),
  getCourseRecord: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ readSession, authorizedRequest }));
vi.mock("@/lib/course-api", () => ({ getCourseRecord }));

import { getCourseMaterialAccess } from "@/lib/course-material-access";

beforeEach(() => {
  readSession.mockReset();
  authorizedRequest.mockReset();
  getCourseRecord.mockReset();
});

describe("permissões dos materiais de curso", () => {
  it("permite acesso de leitura somente com inscrição aprovada", async () => {
    readSession.mockResolvedValue({
      user: {
        id: 21,
        name: "Ana Souza",
        email: "ana@ifce.edu.br",
        role: "Aluno",
        permissions: ["enroll"],
      },
    });
    authorizedRequest.mockResolvedValue([
      {
        id: 14,
        status: "APPROVED",
        course: { id: 8, title: "Curso" },
      },
    ]);

    const access = await getCourseMaterialAccess("8");

    expect(access).toMatchObject({
      isStaff: false,
      isApprovedStudent: true,
    });
    expect(getCourseRecord).not.toHaveBeenCalled();
  });

  it("nega acesso quando a inscrição ainda não foi deferida", async () => {
    readSession.mockResolvedValue({
      user: {
        id: 21,
        name: "Ana Souza",
        email: "ana@ifce.edu.br",
        role: "Aluno",
        permissions: ["enroll"],
      },
    });
    authorizedRequest.mockResolvedValue([
      {
        id: 14,
        status: "PENDING",
        course: { id: 8, title: "Curso" },
      },
    ]);

    const access = await getCourseMaterialAccess("8");

    expect("denied" in access).toBe(true);
    if ("denied" in access) expect(access.denied.status).toBe(404);
  });

  it("permite gerenciamento ao responsável e fornece o status do curso", async () => {
    readSession.mockResolvedValue({
      user: {
        id: 31,
        name: "Professor",
        email: "professor@ifce.edu.br",
        role: "Professor",
        permissions: ["edit-own-course"],
      },
    });
    getCourseRecord.mockResolvedValue({
      id: 8,
      responsibleId: 31,
      status: "APPROVED",
    });

    const access = await getCourseMaterialAccess("8");

    expect(access).toMatchObject({
      isStaff: true,
      course: { status: "APPROVED" },
    });
    expect(authorizedRequest).not.toHaveBeenCalled();
  });
});
