import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { CourseDetails } from "@/components/course-details";
import { CourseEnrollmentForm } from "@/components/course-enrollment-form";
import { StudentCourses } from "@/components/student-courses";
import { normalizeCourses } from "@/lib/courses";
import type { CourseSummary, SessionUser } from "@/lib/types";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

const course: CourseSummary = {
  id: 8,
  title: "Introdução à Programação com Python",
  campus: "Campus Fortaleza",
  status: "PUBLISHED",
  actionType: "Curso",
  startDate: "2026-11-10T12:00:00.000Z",
  endDateEstimated: "2026-12-10T15:00:00.000Z",
  executionHours: 40,
  maxBeneficiaries: 20,
  _count: { enrollments: 12 },
};

const user: SessionUser = {
  id: 3,
  name: "Maria da Silva",
  email: "maria@ifce.edu.br",
  role: "Aluno",
  permissions: ["enroll"],
};

beforeEach(() => {
  push.mockReset();
  refresh.mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("fluxo de inscrição do aluno", () => {
  it("lista cursos abertos com vagas e mostra inscrições já solicitadas", () => {
    render(
      <StudentCourses
        initialCourses={[course]}
        initialEnrollments={[
          {
            id: 14,
            status: "PENDING",
            documents: [],
            course: { id: course.id, title: course.title, status: course.status },
          },
        ]}
      />,
    );

    expect(screen.getByText("Cursos com inscrições abertas")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", {
      name: "Vagas ocupadas: 12 de 20",
    })).toHaveAttribute("aria-valuenow", "12");
    expect(screen.getByRole("link", { name: /Inscrição solicitada/ })).toHaveAttribute(
      "href",
      "/minhas-inscricoes",
    );
  });

  it("conta apenas inscrições aprovadas e identifica o aluno como inscrito", () => {
    const [courseWithTeam] = normalizeCourses([
      {
        ...course,
        teamMembers: [
          { status: "APPROVED" },
          { status: "PENDING" },
          { status: "REJECTED" },
        ],
      },
    ]);

    render(
      <StudentCourses
        initialCourses={[courseWithTeam]}
        initialEnrollments={[
          {
            id: 14,
            status: "APPROVED",
            documents: [],
            course: {
              id: course.id,
              title: course.title,
              status: course.status,
            },
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("progressbar", { name: "Vagas ocupadas: 1 de 20" }),
    ).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByRole("link", { name: /Inscrito/ })).toHaveAttribute(
      "href",
      "/minhas-inscricoes",
    );
  });

  it("atualiza as vagas disponíveis na tela de detalhes do curso", () => {
    const [courseWithTeam] = normalizeCourses([
      {
        ...course,
        teamMembers: [
          { status: "APPROVED" },
          { status: "PENDING" },
          { status: "REJECTED" },
        ],
      },
    ]);

    render(
      <CourseDetails
        initialCourse={courseWithTeam}
        canManage={false}
        canEnroll
        enrollment={{
          id: 14,
          status: "APPROVED",
          documents: [],
          course: { id: course.id, title: course.title, status: course.status },
        }}
      />,
    );

    expect(screen.getByText("1 / 20")).toBeInTheDocument();
    expect(screen.getByText(/19 disponíveis/)).toBeInTheDocument();
    expect(
      screen.getByText("Você já está inscrito neste curso."),
    ).toBeInTheDocument();
    expect(
      document.querySelector(
        ".course-enrollment-panel .course-progress > span",
      ),
    ).toHaveStyle({ width: "5%" });
  });

  it("envia os campos aceitos pela API e abre a inscrição criada", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { id: 14 } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<CourseEnrollmentForm course={course} user={user} />);

    expect(screen.queryByLabelText("Horas dedicadas por semana")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Início da participação")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Fim da participação")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Instituição de vínculo"), {
      target: { value: "IFCE" },
    });
    fireEvent.change(screen.getByLabelText("Renda mensal da família (R$)"), {
      target: { value: "2640.00" },
    });
    fireEvent.change(screen.getByLabelText("Pessoas no domicílio"), {
      target: { value: "4" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar inscrição" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/minhas-inscricoes/14"));
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload).toMatchObject({
      name: "Maria da Silva",
      institution: "IFCE",
      category: "Aluno",
      bond: "Discente",
      receivesScholarship: false,
      dedicatedHours: course.executionHours,
      participationStart: course.startDate,
      participationEnd: course.endDateEstimated,
      householdIncomeCents: 264000,
      householdSize: 4,
    });
    expect(payload.userId).toBeUndefined();
  });
});
