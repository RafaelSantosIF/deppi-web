import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { EnrollmentDocuments } from "@/components/enrollment-documents";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }),
}));

beforeEach(() => {
  refresh.mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("documentos de inscrição", () => {
  it("envia a categoria da API junto ao arquivo original", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { id: "doc-id" } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <EnrollmentDocuments
        enrollmentId={14}
        courseTitle="Curso de teste"
        status="PENDING"
        householdIncomeCents={264000}
        householdSize={4}
        canUpdateHousehold={false}
        initialDocuments={[]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Categoria do documento"), {
      target: { value: "PROOF_OF_INCOME" },
    });
    fireEvent.change(screen.getByLabelText("Escolher documento para enviar"), {
      target: {
        files: [new File(["comprovante"], "renda.pdf", { type: "application/pdf" })],
      },
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const payload = fetchMock.mock.calls[0][1].body as FormData;
    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/enroll/enrollments/14/documents",
    );
    expect(payload.get("category")).toBe("PROOF_OF_INCOME");
    expect((payload.get("file") as File).name).toBe("renda.pdf");
  });
});
