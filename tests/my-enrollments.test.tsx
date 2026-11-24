import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MyEnrollments } from "@/components/my-enrollments";

describe("minhas inscrições", () => {
  it("mostra materiais do curso somente para inscrição deferida", () => {
    const markup = renderToStaticMarkup(
      <MyEnrollments
        enrollments={[
          {
            id: 14,
            status: "APPROVED",
            documents: [],
            course: { id: 8, title: "Curso deferido", status: "PUBLISHED" },
          },
          {
            id: 15,
            status: "PENDING",
            documents: [],
            course: { id: 9, title: "Curso pendente", status: "PUBLISHED" },
          },
          {
            id: 16,
            status: "REJECTED",
            rejectionReason: "Documento ilegível.",
            documents: [],
            course: { id: 10, title: "Curso indeferido", status: "PUBLISHED" },
          },
        ]}
      />,
    );

    expect(markup).toContain('href="/cursos/8/materiais"');
    expect(markup).not.toContain('href="/cursos/9/materiais"');
    expect(markup).toContain("Documento ilegível.");
  });
});
