import { notFound, redirect } from "next/navigation";
import { CourseEnrollmentForm } from "@/components/course-enrollment-form";
import { can } from "@/lib/permissions";
import { ApiError } from "@/lib/api";
import { normalizeEnrollments } from "@/lib/enrollments";
import { hasOpenEnrollment, normalizeCourses } from "@/lib/courses";
import { pageRequest, requireSession } from "@/lib/session";

export default async function CourseEnrollmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  if (!can(session.user, "enroll")) redirect("/403");
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) notFound();

  let course;
  try {
    const data = await pageRequest<unknown>(`/courses/${id}`, `/cursos/${id}/inscricao`);
    course = normalizeCourses([data])[0];
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  if (!course || course.status !== "PUBLISHED" || !hasOpenEnrollment(course)) {
    notFound();
  }

  const enrollments = normalizeEnrollments(
    await pageRequest<unknown>(
      "/enroll/enrollments/me",
      `/cursos/${id}/inscricao`,
    ),
  );
  if (enrollments.some((enrollment) => enrollment.course.id === course.id)) {
    redirect("/minhas-inscricoes");
  }

  return <CourseEnrollmentForm course={course} user={session.user} />;
}
