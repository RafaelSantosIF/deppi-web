import { notFound, redirect } from "next/navigation";
import { CourseDetails } from "@/components/course-details";
import { can } from "@/lib/permissions";
import { ApiError } from "@/lib/api";
import { pageRequest, requireSession } from "@/lib/session";
import { normalizeCourses } from "@/lib/courses";
import { normalizeEnrollments } from "@/lib/enrollments";
import type { EnrollmentSummary } from "@/lib/types";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  if (
    !can(
      session.user,
      "view-courses",
      "manage-courses",
      "create-course",
      "edit-own-course",
      "enroll",
      "manage-own-enrollments",
    )
  ) {
    redirect("/403");
  }
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) notFound();
  let data: unknown;
  try {
    data = await pageRequest<unknown>(`/courses/${id}`, `/cursos/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    if (!(error instanceof ApiError)) throw error;
    return (
      <CourseDetails
        initialCourse={null}
        initialError
        canManage={can(session.user, "manage-courses")}
      />
    );
  }
  const course = normalizeCourses([data])[0];
  if (!course?.id) notFound();
  const canManageAny = can(session.user, "manage-courses", "edit-any-course");
  if (
    !canManageAny &&
    course.status !== "PUBLISHED" &&
    course.responsibleId !== session.user.id
  ) {
    notFound();
  }
  const canEnroll =
    can(session.user, "enroll") &&
    !can(
      session.user,
      "manage-courses",
      "create-course",
      "edit-own-course",
      "edit-any-course",
    ) &&
    course.status === "PUBLISHED";
  let enrollment: EnrollmentSummary | undefined;
  if (canEnroll) {
    enrollment = normalizeEnrollments(
      await pageRequest<unknown>(
        "/enroll/enrollments/me",
        `/cursos/${id}`,
      ),
    ).find((item) => item.course.id === course.id);
  }
  return (
    <CourseDetails
      initialCourse={course}
      canManage={can(session.user, "manage-courses")}
      canEnroll={canEnroll}
      enrollment={enrollment}
      canEdit={
        course.responsibleId === session.user.id &&
        can(session.user, "edit-own-course") &&
        course.status !== "PENDING_APPROVAL"
      }
      isOwner={course.responsibleId === session.user.id}
    />
  );
}
