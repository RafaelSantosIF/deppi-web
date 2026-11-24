import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EnrollmentQueue } from "@/components/enrollment-queue";
import { normalizeEnrollmentQueue } from "@/lib/enrollments";

const response = {
  items: [
    {
      id: 14,
      status: "PENDING",
      name: "Maria da Silva",
      email: "maria@ifce.edu.br",
      registration: "2026001234",
      institution: "IFCE",
      category: "Aluno",
      bond: "Discente",
      receivesScholarship: false,
      dedicatedHours: 8,
      participationStart: "2026-11-10T12:00:00.000Z",
      householdIncomeCents: 264000,
      householdSize: 4,
      createdAt: "2026-11-16T19:00:00.000Z",
      course: { id: 8, title: "Introdução à Programação" },
      documents: [
        {
          id: "c77f532a-b8fb-4b9e-88b6-6b179986e1aa",
          fileName: "rg.pdf",
          category: "RG",
          createdAt: "2026-11-16T19:00:00.000Z",
        },
      ],
    },
  ],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

describe("fila de inscrições do DEPPI", () => {
  it("normaliza a resposta paginada incluindo renda e categoria dos anexos", () => {
    const result = normalizeEnrollmentQueue(response);
    expect(result.items[0]).toMatchObject({
      id: 14,
      email: "maria@ifce.edu.br",
      registration: "2026001234",
      householdIncomeCents: 264000,
      householdSize: 4,
      course: { id: 8, title: "Introdução à Programação" },
      documents: [{ category: "RG", fileName: "rg.pdf" }],
    });
    expect(result.pagination).toEqual(response.pagination);
  });

  it("usa o e-mail e a matrícula do perfil quando a inscrição não os contém", () => {
    const result = normalizeEnrollmentQueue({
      items: [
        {
          ...response.items[0],
          email: undefined,
          registration: undefined,
          user: {
            email: "maria@ifce.edu.br",
            functionalData: { registration: "2026005678" },
          },
        },
      ],
      pagination: response.pagination,
    });

    expect(result.items[0]).toMatchObject({
      email: "maria@ifce.edu.br",
      registration: "2026005678",
    });
  });

  it("mostra os dados resumidos e liga à análise da inscrição", () => {
    const result = normalizeEnrollmentQueue(response);
    const markup = renderToStaticMarkup(
      <EnrollmentQueue
        items={result.items}
        pagination={result.pagination}
        filters={{ status: "PENDING", search: "", courseId: "" }}
        statusCounts={{
          PENDING: 1,
          APPROVED: 2,
          REJECTED: 0,
          CANCELLED: 0,
          ALL: 3,
        }}
      />,
    );
    expect(markup).toContain("Maria da Silva");
    expect(markup).toContain("maria@ifce.edu.br");
    expect(markup).toContain("2026001234");
    expect(markup).toContain("Pendentes");
    expect(markup).toContain("Todas");
    expect(markup).toContain(encodeURIComponent("Introdução à Programação"));
  });
});
