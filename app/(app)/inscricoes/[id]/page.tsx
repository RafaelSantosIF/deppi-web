import { notFound, redirect } from "next/navigation";
import { EnrollmentReview } from "@/components/enrollment-review";
import { can } from "@/lib/permissions";
import { normalizeEnrollmentDocuments } from "@/lib/enrollments";
import { pageRequest, requireSession } from "@/lib/session";
import type { EnrollmentQueueItem } from "@/lib/types";

function normalizeReviewRecord(data: unknown, courseTitle: string): EnrollmentQueueItem | null {
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;
  const item =
    root.enrollment && typeof root.enrollment === "object"
      ? (root.enrollment as Record<string, unknown>)
      : root;
  const id = Number(item.id);
  const courseId = Number(item.courseId);
  if (!Number.isInteger(id) || !Number.isInteger(courseId)) return null;
  return {
    id,
    status: String(item.status ?? "PENDING"),
    name: String(item.name ?? "Aluno"),
    institution: String(item.institution ?? ""),
    category: String(item.category ?? ""),
    bond: String(item.bond ?? ""),
    receivesScholarship: item.receivesScholarship === true,
    dedicatedHours: Number(item.dedicatedHours ?? 0),
    participationStart: String(item.participationStart ?? ""),
    participationEnd:
      typeof item.participationEnd === "string" ? item.participationEnd : null,
    householdIncomeCents:
      typeof item.householdIncomeCents === "number"
        ? item.householdIncomeCents
        : null,
    householdSize:
      typeof item.householdSize === "number" ? item.householdSize : null,
    createdAt: String(item.createdAt ?? ""),
    course: { id: courseId, title: courseTitle || `Curso #${courseId}` },
    documents: normalizeEnrollmentDocuments(item.documents),
  };
}

export default async function EnrollmentReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ course?: string | string[] }>;
}) {
  const session = await requireSession();
  if (!can(session.user, "manage-enrollments", "manage-any-enrollments")) {
    redirect("/403");
  }
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) notFound();
  const query = await searchParams;
  const courseTitle = Array.isArray(query.course) ? query.course[0] : query.course ?? "";
  const data = await pageRequest<unknown>(
    `/enroll/enrollments/${id}`,
    `/inscricoes/${id}`,
  );
  const enrollment = normalizeReviewRecord(data, courseTitle);
  if (!enrollment) notFound();
  return <EnrollmentReview enrollment={enrollment} />;
}
