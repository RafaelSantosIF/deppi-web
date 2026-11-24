import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CourseMaterialsManager } from "@/components/course-materials-manager";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("materiais didáticos do curso", () => {
  it("permite ao professor enviar arquivo e atualiza a lista", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { files: [] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: "file-1" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            files: [
              {
                id: "file-1",
                fileName: "slides.pdf",
                size: 2048,
                createdAt: "2026-11-20T12:00:00.000Z",
              },
            ],
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);
    render(<CourseMaterialsManager courseId={8} />);

    await screen.findByText("Nenhum material anexado");
    const file = new File(["slides"], "slides.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Adicionar material didático"), {
      target: { files: [file] },
    });

    expect(await screen.findByText("Material didático enviado.")).toBeTruthy();
    expect(await screen.findByText("slides.pdf")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const payload = fetchMock.mock.calls[1][1].body as FormData;
    expect(fetchMock.mock.calls[1][0]).toBe("/api/courses/8/files");
    expect(payload.get("file")).toBe(file);
  });
});
