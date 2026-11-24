import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { HomeFeedbackNotifications } from "@/components/home-feedback-notifications";
import type { CourseSummary, EnrollmentSummary } from "@/lib/types";

const enrollment: EnrollmentSummary = {
  id: 21,
  status: "REJECTED",
  rejectionReason: "Comprovante de renda ilegível.",
  statusUpdatedAt: "2026-11-17T12:00:00.000Z",
  documents: [],
  course: { id: 9, title: "Introdução a Python", status: "PUBLISHED" },
};

const rejectedCourse: CourseSummary = {
  id: 12,
  title: "Projeto de extensão",
  campus: "Fortaleza",
  status: "REJECTED",
  rejectionReason: "Revise o cronograma de execução.",
  updatedAt: "2026-11-17T12:00:00.000Z",
  actionType: "Projeto",
  startDate: "2026-11-01",
  endDateEstimated: "2026-12-01",
  executionHours: 40,
  maxBeneficiaries: 20,
};

const storage = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, String(value)),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
};

beforeEach(() => {
  storage.clear();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: localStorageMock,
  });
});

afterEach(() => {
  cleanup();
});

describe("notificações de feedback na home", () => {
  it("exibe as justificativas e permite marcar cada retorno como lido", async () => {
    render(
      <HomeFeedbackNotifications
        userId={7}
        enrollments={[enrollment]}
        rejectedCourses={[rejectedCourse]}
      />,
    );

    expect(
      screen.getByText("Justificativa: Comprovante de renda ilegível."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Justificativa: Revise o cronograma de execução."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ver inscrição" }),
    ).toHaveAttribute("href", "/minhas-inscricoes/21");
    expect(
      screen.getByRole("link", {
        name: "Corrigir e reenviar para avaliação",
      }),
    ).toHaveAttribute("href", "/cursos/12/editar");

    fireEvent.click(
      screen.getByRole("button", {
        name: "Marcar como lida: Inscrição indeferida: Introdução a Python",
      }),
    );

    await waitFor(() => {
      expect(
        screen.queryByText("Inscrição indeferida: Introdução a Python"),
      ).not.toBeInTheDocument();
    });
    expect(
      JSON.parse(
        window.localStorage.getItem("deppi:home-feedback:v1:7") ?? "[]",
      ),
    ).toContain("enrollment-21-2026-11-17T12:00:00.000Z");
  });

  it("mantém uma notificação lida oculta ao remontar a home", async () => {
    const props = {
      userId: 7,
      enrollments: [enrollment],
      rejectedCourses: [],
    };
    const firstRender = render(<HomeFeedbackNotifications {...props} />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Marcar como lida: Inscrição indeferida: Introdução a Python",
      }),
    );
    firstRender.unmount();

    render(<HomeFeedbackNotifications {...props} />);

    await waitFor(() => {
      expect(
        screen.queryByText("Inscrição indeferida: Introdução a Python"),
      ).not.toBeInTheDocument();
    });
  });
});
