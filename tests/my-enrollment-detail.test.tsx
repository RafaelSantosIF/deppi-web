import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { requireSession, pageRequest, refresh } = vi.hoisted(() => ({
  requireSession: vi.fn(),
  pageRequest: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ requireSession, pageRequest }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  redirect: () => {
    throw new Error("REDIRECT");
  },
  useRouter: () => ({ refresh }),
}));

import EnrollmentPage from "@/app/(app)/minhas-inscricoes/[id]/page";

beforeEach(() => {
  requireSession.mockReset();
  pageRequest.mockReset();
  refresh.mockReset();
  requireSession.mockResolvedValue({
    user: { id: 21, permissions: ["enroll"] },
  });
  pageRequest.mockResolvedValue([
    {
      id: 11,
      status: "REJECTED",
      statusReason: "Documento ilegível.",
      course: { id: 8, title: "Curso Técnico em Solda Industrial" },
      documents: [],
      householdIncomeCents: 264000,
      householdSize: 4,
    },
  ]);
});

describe("detalhes da inscrição do aluno", () => {
  it("exibe a justificativa retornada em statusReason pela API", async () => {
    const page = await EnrollmentPage({
      params: Promise.resolve({ id: "11" }),
    });
    const markup = renderToStaticMarkup(page);

    expect(markup).toContain("Justificativa: Documento ilegível.");
  });
});
