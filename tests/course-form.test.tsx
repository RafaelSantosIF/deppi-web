import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CourseForm } from "@/components/course-form";
import type { CourseSummary, Institution } from "@/lib/types";

afterEach(cleanup);

const institutions: Institution[] = [
  {
    id: 11,
    name: "Instituto Federal do Ceará",
    acronym: "IFCE",
    city: "Fortaleza",
    cnpj: "",
    active: true,
  },
  {
    id: 12,
    name: "Instituto Federal de Sergipe",
    acronym: "IFS",
    city: "Aracaju",
    cnpj: "",
    active: true,
  },
];

describe("seletor de instituição do curso", () => {
  it("filtra instituições em um campo único e exibe nome e cidade", () => {
    render(
      <CourseForm
        course={null}
        institutions={institutions}
        responsibleId={1}
        responsibleName="Maria"
        professors={[]}
        canAssignResponsible={false}
        busy={false}
        onCancel="/cursos"
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    const selector = screen.getByRole("combobox", {
      name: "Instituição do curso",
    });
    fireEvent.focus(selector);

    expect(
      screen.getByRole("option", {
        name: "Instituto Federal do Ceará - Fortaleza",
      }),
    ).toBeInTheDocument();

    fireEvent.change(selector, { target: { value: "Aracaju" } });

    expect(
      screen.getByRole("option", {
        name: "Instituto Federal de Sergipe - Aracaju",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", {
        name: "Instituto Federal do Ceará - Fortaleza",
      }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("option", {
        name: "Instituto Federal de Sergipe - Aracaju",
      }),
    );

    expect(selector).toHaveValue("Instituto Federal de Sergipe - Aracaju");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("mostra a justificativa e mantém a opção de reenviar curso indeferido", () => {
    const course: CourseSummary = {
      id: 8,
      title: "Curso indeferido",
      campus: institutions[0].name,
      status: "REJECTED",
      rejectionReason: "Ajuste a carga horária.",
      actionType: "Curso",
      startDate: "2026-11-10T12:00:00.000Z",
      endDateEstimated: "2026-12-10T15:00:00.000Z",
      executionHours: 40,
      maxBeneficiaries: 20,
      responsibleId: 1,
    };

    render(
      <CourseForm
        course={course}
        institutions={institutions}
        responsibleId={1}
        responsibleName="Maria"
        professors={[]}
        canAssignResponsible={false}
        busy={false}
        onCancel="/cursos/8"
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(
      screen.getByText(/Ajuste a carga horária\./),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Salvar e enviar para avaliação",
      }),
    ).toBeEnabled();
  });
});
