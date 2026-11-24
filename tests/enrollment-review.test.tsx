import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { EnrollmentReview } from "@/components/enrollment-review";
import type { EnrollmentQueueItem } from "@/lib/types";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

const enrollment: EnrollmentQueueItem = {
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
  participationEnd: null,
  householdIncomeCents: 264000,
  householdSize: 4,
  createdAt: "2026-11-16T19:00:00.000Z",
  course: { id: 8, title: "Introdução à Programação" },
  documents: [],
};

beforeEach(() => {
  replace.mockReset();
  refresh.mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("análise de inscrição", () => {
  it("solicita confirmação personalizada antes de deferir", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<EnrollmentReview enrollment={enrollment} />);

    fireEvent.click(screen.getByRole("button", { name: "Deferir" }));
    expect(screen.getByRole("dialog", { name: "Deferir inscrição" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Deferir inscrição" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      status: "APPROVED",
    });
    expect(replace).toHaveBeenCalledWith("/inscricoes");
  });

  it("usa modal de indeferimento e valida um motivo opcional", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<EnrollmentReview enrollment={enrollment} />);

    fireEvent.click(screen.getByRole("button", { name: "Indeferir" }));
    expect(screen.getByRole("dialog", { name: "Indeferir inscrição" })).toBeTruthy();
    const reason = screen.getByLabelText("Motivo (opcional)");
    fireEvent.change(reason, { target: { value: "Oi" } });
    fireEvent.click(screen.getByRole("button", { name: "Indeferir inscrição" }));

    expect(await screen.findByText(/pelo menos 3 caracteres/)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(reason, {
      target: { value: "Documentação incompleta." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Indeferir inscrição" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      status: "REJECTED",
      reason: "Documentação incompleta.",
    });
  });
});
