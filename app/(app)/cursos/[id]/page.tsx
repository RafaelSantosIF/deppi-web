import { notFound, redirect } from "next/navigation";
import { CourseDetails } from "@/components/course-details";
import { can } from "@/lib/permissions";
import { ApiError } from "@/lib/api";
import { pageRequest, requireSession } from "@/lib/session";
import { normalizeCourses } from "@/lib/courses";

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
  return (
    <CourseDetails
      initialCourse={course}
      canManage={can(session.user, "manage-courses")}
      canEdit={
        course.responsibleId === session.user.id &&
        can(session.user, "edit-own-course") &&
        course.status !== "PENDING_APPROVAL"
      }
      isOwner={course.responsibleId === session.user.id}
    />
  );
}
