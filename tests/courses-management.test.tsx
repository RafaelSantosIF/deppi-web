import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CoursesManagement } from "@/components/courses-management";
import type { Institution } from "@/lib/types";

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

const courses = [
  {
    id: 4,
    title: "Python para todos",
    campus: "Instituto Federal do Ceará",
    institutionId: 11,
    status: "PUBLISHED",
    startDate: "2026-11-10T12:00:00.000Z",
    endDateEstimated: "2026-11-20T15:00:00.000Z",
    executionHours: 40,
    maxBeneficiaries: 20,
    _count: { enrollments: 12 },
  },
  {
    id: 5,
    title: "Robótica educacional",
    campus: "Instituto Federal de Sergipe",
    institutionId: 12,
    status: "PENDING_APPROVAL",
    startDate: "2026-11-10T12:00:00.000Z",
    endDateEstimated: "2026-11-20T15:00:00.000Z",
    executionHours: 20,
    maxBeneficiaries: 10,
    _count: { enrollments: 0 },
  },
];

function renderCourses() {
  return render(
    <CoursesManagement
      initialCourses={courses}
      initialInstitutions={institutions}
      canManage
      canCreate
      canEditOwn={false}
      responsibleId={1}
    />,
  );
}

describe("listagem de cursos", () => {
  it("mostra cursos em cartões com instituição curta, status e progresso de inscrições", () => {
    renderCourses();

    expect(screen.getByText("IFCE - Fortaleza", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("IFS - Aracaju", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("12/20")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", {
      name: "Inscrições: 12 de 20 vagas",
    })).toHaveAttribute("aria-valuenow", "12");
    expect(screen.getByText("Em análise", { selector: "span" })).toBeInTheDocument();
  });

  it("filtra por nome, status e instituição", () => {
    renderCourses();

    fireEvent.change(screen.getByLabelText("Buscar por nome"), {
      target: { value: "robótica" },
    });
    expect(screen.getByText("Robótica educacional")).toBeInTheDocument();
    expect(screen.queryByText("Python para todos")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Buscar por nome"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Filtrar por status"), {
      target: { value: "PUBLISHED" },
    });
    expect(screen.getByText("Python para todos")).toBeInTheDocument();
    expect(screen.queryByText("Robótica educacional")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filtrar por status"), {
      target: { value: "all" },
    });
    fireEvent.change(screen.getByLabelText("Filtrar por instituição"), {
      target: { value: "12" },
    });
    expect(screen.getByText("Robótica educacional")).toBeInTheDocument();
    expect(screen.queryByText("Python para todos")).not.toBeInTheDocument();
  });
});
