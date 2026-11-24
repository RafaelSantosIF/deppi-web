import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCourseMaterialAccess, authorizedRequest, authorizedResponse } =
  vi.hoisted(() => ({
    getCourseMaterialAccess: vi.fn(),
    authorizedRequest: vi.fn(),
    authorizedResponse: vi.fn(),
  }));

vi.mock("@/lib/course-material-access", () => ({ getCourseMaterialAccess }));
vi.mock("@/lib/session", () => ({ authorizedRequest, authorizedResponse }));
vi.mock("@/lib/api", () => ({
  ApiError: class extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
  apiErrorResponse: (error: Error) =>
    Response.json({ success: false, error: error.message }, { status: 500 }),
}));

import {
  GET as listMaterials,
  POST as uploadMaterial,
} from "@/app/api/courses/[id]/files/route";
import { GET as downloadMaterial } from "@/app/api/courses/[id]/files/[documentId]/download/route";

beforeEach(() => {
  getCourseMaterialAccess.mockReset();
  authorizedRequest.mockReset();
  authorizedResponse.mockReset();
  getCourseMaterialAccess.mockResolvedValue({
    session: { user: { id: 8 } },
    course: { status: "PUBLISHED" },
    isStaff: true,
    isApprovedStudent: false,
  });
});

describe("rotas dos materiais didáticos", () => {
  it("encaminha arquivos para a API e bloqueia cursos ainda não aprovados", async () => {
    authorizedRequest.mockResolvedValue({ id: "file-1" });
    const formData = new FormData();
    formData.set("file", new File(["slide"], "slides.pdf", { type: "application/pdf" }));
    const response = await uploadMaterial(
      { formData: async () => formData } as Request,
      { params: Promise.resolve({ id: "8" }) },
    );

    expect(response.status).toBe(200);
    expect(authorizedRequest).toHaveBeenCalledWith(
      "/courses/8/files",
      expect.objectContaining({ method: "POST", body: expect.any(FormData) }),
    );

    getCourseMaterialAccess.mockResolvedValueOnce({
      session: { user: { id: 8 } },
      course: { status: "PENDING_APPROVAL" },
      isStaff: true,
      isApprovedStudent: false,
    });
    const pendingResponse = await uploadMaterial(
      { formData: async () => formData } as Request,
      { params: Promise.resolve({ id: "8" }) },
    );
    expect(pendingResponse.status).toBe(409);
    expect(authorizedRequest).toHaveBeenCalledOnce();
  });

  it("restringe listagem de gerenciamento a professores/gestores autorizados", async () => {
    getCourseMaterialAccess.mockResolvedValueOnce({
      denied: Response.json({ success: false }, { status: 404 }),
    });

    const response = await listMaterials(
      new Request("http://localhost"),
      { params: Promise.resolve({ id: "8" }) },
    );

    expect(response.status).toBe(404);
    expect(authorizedRequest).not.toHaveBeenCalled();
  });

  it("não encaminha download quando não há inscrição aprovada", async () => {
    getCourseMaterialAccess.mockResolvedValueOnce({
      denied: Response.json({ success: false }, { status: 404 }),
    });

    const response = await downloadMaterial(
      new Request("http://localhost"),
      { params: Promise.resolve({ id: "8", documentId: "file-1" }) },
    );

    expect(response.status).toBe(404);
    expect(authorizedResponse).not.toHaveBeenCalled();
  });
});
