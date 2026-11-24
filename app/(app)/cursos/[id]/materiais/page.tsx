import { notFound, redirect } from "next/navigation";
import { CourseMaterialsLibrary } from "@/components/course-materials-library";
import { can } from "@/lib/permissions";
import { normalizeCourseMaterials } from "@/lib/course-materials";
import { normalizeEnrollments } from "@/lib/enrollments";
import { pageRequest, requireSession } from "@/lib/session";

export default async function CourseMaterialsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  if (!can(session.user, "enroll")) redirect("/403");
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) notFound();

  const enrollments = normalizeEnrollments(
    await pageRequest<unknown>(
      "/enroll/enrollments/me",
      `/cursos/${id}/materiais`,
    ),
  );
  const enrollment = enrollments.find(
    (item) => item.course.id === Number(id) && item.status === "APPROVED",
  );
  if (!enrollment) notFound();

  const files = await pageRequest<unknown>(
    `/courses/${id}/files`,
    `/cursos/${id}/materiais`,
  );

  return (
    <CourseMaterialsLibrary
      courseId={enrollment.course.id}
      courseTitle={enrollment.course.title}
      materials={normalizeCourseMaterials(files)}
    />
  );
}
