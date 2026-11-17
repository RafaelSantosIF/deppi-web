import { redirect } from "next/navigation";
import { MyEnrollments } from "@/components/my-enrollments";
import { ApiError } from "@/lib/api";
import { normalizeEnrollments } from "@/lib/enrollments";
import { can } from "@/lib/permissions";
import { pageRequest, requireSession } from "@/lib/session";
import type { EnrollmentSummary } from "@/lib/types";

export default async function MyEnrollmentsPage() {
  const session = await requireSession();
  if (!can(session.user, "enroll", "manage-own-enrollments")) {
    redirect("/403");
  }
  let enrollments: EnrollmentSummary[] = [];
  let initialError = false;
  try {
    const data = await pageRequest<unknown>(
      "/enroll/enrollments/me",
      "/minhas-inscricoes",
    );
    enrollments = normalizeEnrollments(data);
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    initialError = true;
  }
  return <MyEnrollments enrollments={enrollments} initialError={initialError} />;
}
