import { apiErrorResponse } from "@/lib/api";
import { requireCoursePermission } from "@/lib/course-api";
import { authorizedRequest } from "@/lib/session";

const categories = new Set([
  "RG",
  "CPF",
  "PROOF_OF_ADDRESS",
  "PROOF_OF_INCOME",
  "SCHOOL_TRANSCRIPT",
  "OTHER",
]);
const maxFileSize = 10 * 1024 * 1024;
const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

export async function POST(
  request: Request,
  context: { params: Promise<{ enrollmentId: string }> },
) {
  const denied = await requireCoursePermission(
    "enroll",
    "manage-own-enrollments",
  );
  if (denied) return denied;
  const { enrollmentId } = await context.params;
  if (!/^[1-9]\d*$/.test(enrollmentId)) {
    return Response.json(
      { success: false, error: "Inscrição não encontrada." },
      { status: 404 },
    );
  }
  try {
    const incoming = await request.formData();
    const file = incoming.get("file");
    const category = incoming.get("category");
    if (
      !(file instanceof File) ||
      typeof category !== "string" ||
      !categories.has(category) ||
      file.size === 0 ||
      file.size > maxFileSize ||
      !allowedTypes.has(file.type)
    ) {
      return Response.json(
        {
          success: false,
          error: "Selecione uma categoria e um arquivo PDF, JPG ou PNG de até 10 MB.",
        },
        { status: 400 },
      );
    }

    const payload = new FormData();
    payload.set("file", file);
    payload.set("category", category);
    const data = await authorizedRequest<unknown>(
      `/enroll/enrollments/${enrollmentId}/documents`,
      { method: "POST", body: payload },
    );
    return Response.json({ success: true, data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

