import { beforeEach, describe, expect, it, vi } from "vitest";

const { authorizedRequest, readSession, requireCoursePermission } = vi.hoisted(
  () => ({
    authorizedRequest: vi.fn(),
    readSession: vi.fn(),
    requireCoursePermission: vi.fn(),
  }),
);

vi.mock("@/lib/session", () => ({ authorizedRequest, readSession }));
vi.mock("@/lib/course-api", () => ({ requireCoursePermission }));
vi.mock("@/lib/api", () => ({
  apiErrorResponse: (error: Error) =>
    Response.json({ success: false, error: error.message }, { status: 500 }),
}));

import { POST } from "@/app/api/enroll/courses/[courseId]/enrollments/route";

beforeEach(() => {
  authorizedRequest.mockReset();
  readSession.mockReset();
  requireCoursePermission.mockReset();
  requireCoursePermission.mockResolvedValue(null);
  readSession.mockResolvedValue({ user: { id: 21 } });
  authorizedRequest.mockResolvedValue({ id: 14, status: "PENDING" });
});

describe("criação de inscrição", () => {
  it("usa o usuário da sessão ao encaminhar a inscrição para a API", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: 99,
        name: "Maria da Silva",
        institution: "IFCE",
        category: "Aluno",
        bond: "Discente",
        receivesScholarship: false,
        dedicatedHours: 8,
        householdIncomeCents: 264000,
        householdSize: 4,
        participationStart: "2026-11-10T12:00:00.000Z",
        participationEnd: "2026-12-10T12:00:00.000Z",
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ courseId: "8" }),
    });

    expect(response.status).toBe(200);
    expect(authorizedRequest).toHaveBeenCalledWith(
      "/enroll/courses/8/enrollments",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"userId":21'),
      }),
    );
    expect(JSON.parse(authorizedRequest.mock.calls[0][1].body).userId).toBe(21);
  });

  it("recusa dados incompletos antes de chamar a API", async () => {
    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Maria" }),
      }),
      { params: Promise.resolve({ courseId: "8" }) },
    );

    expect(response.status).toBe(400);
    expect(authorizedRequest).not.toHaveBeenCalled();
  });
});
