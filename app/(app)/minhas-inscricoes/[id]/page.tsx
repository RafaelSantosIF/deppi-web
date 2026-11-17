import { notFound, redirect } from "next/navigation";
import { EnrollmentDocuments } from "@/components/enrollment-documents";
import { can } from "@/lib/permissions";
import { normalizeEnrollmentDocuments } from "@/lib/enrollments";
import { pageRequest, requireSession } from "@/lib/session";

function enrollmentDetails(item: unknown) {
  if (!item || typeof item !== "object") return null;
  const record = item as Record<string, unknown>;
  const course =
    record.course && typeof record.course === "object"
      ? (record.course as Record<string, unknown>)
      : {};
  const id = Number(record.id);
  if (!Number.isInteger(id) || !course.title) return null;
  return {
    id,
    status: String(record.status ?? "PENDING"),
    courseTitle: String(course.title),
    householdIncomeCents:
      typeof record.householdIncomeCents === "number"
        ? record.householdIncomeCents
        : null,
    householdSize:
      typeof record.householdSize === "number" ? record.householdSize : null,
    documents: normalizeEnrollmentDocuments(record.documents),
  };
}

export default async function EnrollmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  if (!can(session.user, "enroll", "manage-own-enrollments")) {
    redirect("/403");
  }
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) notFound();

  const data = await pageRequest<unknown>(
    "/enroll/enrollments/me",
    `/minhas-inscricoes/${id}`,
  );
  const enrollmentList = Array.isArray(data)
    ? data
    : data && typeof data === "object" &&
        Array.isArray((data as Record<string, unknown>).enrollments)
      ? (data as { enrollments: unknown[] }).enrollments
      : [];
  const enrollment = enrollmentList
    .map(enrollmentDetails)
    .find((item) => item?.id === Number(id));
  if (!enrollment) notFound();

  return (
    <EnrollmentDocuments
      enrollmentId={enrollment.id}
      courseTitle={enrollment.courseTitle}
      status={enrollment.status}
      householdIncomeCents={enrollment.householdIncomeCents}
      householdSize={enrollment.householdSize}
      canUpdateHousehold={can(session.user, "manage-own-enrollments")}
      initialDocuments={enrollment.documents}
    />
  );
}
