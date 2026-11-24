import { redirect } from "next/navigation";
import { EnrollmentQueue } from "@/components/enrollment-queue";
import { can } from "@/lib/permissions";
import { normalizeEnrollmentQueue } from "@/lib/enrollments";
import { pageRequest, requireSession } from "@/lib/session";

const statuses = new Set([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "WAITLISTED",
  "CANCELLED",
]);
const countStatuses = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "WAITLISTED",
] as const;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

function positiveInteger(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export default async function EnrollmentQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  if (!can(session.user, "manage-enrollments", "manage-any-enrollments")) {
    redirect("/403");
  }
  const params = await searchParams;
  const requestedStatus = first(params.status);
  const status =
    params.status === undefined
      ? "PENDING"
      : requestedStatus === "" || statuses.has(requestedStatus)
        ? requestedStatus
        : "PENDING";
  const search = first(params.search).trim().slice(0, 100);
  const requestedCourseId = first(params.courseId);
  const courseId = /^[1-9]\d*$/.test(requestedCourseId)
    ? requestedCourseId
    : "";
  const page = positiveInteger(first(params.page), 1);
  const query = new URLSearchParams({ page: String(page), limit: "20" });
  if (status) query.set("status", status);
  if (search) query.set("search", search);
  if (courseId) query.set("courseId", courseId);
  const [data, statusCounts] = await Promise.all([
    pageRequest<unknown>(
      `/enroll/enrollments?${query.toString()}`,
      "/inscricoes",
    ),
    Promise.all(
      countStatuses.map(async (countStatus) => {
        const countQuery = new URLSearchParams({ page: "1", limit: "1" });
        countQuery.set("status", countStatus);
        const countData = await pageRequest<unknown>(
          `/enroll/enrollments?${countQuery.toString()}`,
          "/inscricoes",
        );
        return [countStatus, normalizeEnrollmentQueue(countData).pagination.total] as const;
      }),
    ),
  ]);
  const result = normalizeEnrollmentQueue(data);
  const counts = Object.fromEntries(statusCounts);
  const totalCount = countStatuses.reduce(
    (total, countStatus) => total + (counts[countStatus] ?? 0),
    0,
  );

  return (
    <EnrollmentQueue
      items={result.items}
      pagination={result.pagination}
      filters={{ status, search, courseId }}
      statusCounts={{ ...counts, ALL: totalCount }}
    />
  );
}
