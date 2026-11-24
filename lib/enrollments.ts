import type {
  EnrollmentQueueItem,
  EnrollmentSummary,
} from "./types";

export function normalizeEnrollments(data: unknown): EnrollmentSummary[] {
  const root =
    data && typeof data === "object"
      ? (data as Record<string, unknown>)
      : {};
  const source = Array.isArray(data)
    ? data
    : Array.isArray(root.enrollments)
      ? root.enrollments
      : [];
  return source.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    const course =
      item.course && typeof item.course === "object"
        ? (item.course as Record<string, unknown>)
        : {};
    const courseId = Number(course.id);
    const id = Number(item.id);
    if (!Number.isInteger(id) || !Number.isInteger(courseId)) return [];
    const documents = Array.isArray(item.documents)
      ? item.documents.flatMap((document) => {
          if (!document || typeof document !== "object") return [];
          const documentId = (document as Record<string, unknown>).id;
          return typeof documentId === "string" ||
            typeof documentId === "number"
            ? [{ id: String(documentId) }]
            : [];
        })
      : [];
    return [
      {
        id,
        status: String(item.status ?? "PENDING"),
        rejectionReason:
          typeof item.statusReason === "string"
            ? item.statusReason
            : typeof item.reason === "string"
              ? item.reason
              : typeof item.rejectionReason === "string"
                ? item.rejectionReason
                : undefined,
        statusUpdatedAt:
          typeof item.statusUpdatedAt === "string"
            ? item.statusUpdatedAt
            : undefined,
        documents,
        course: {
          id: courseId,
          title: String(course.title ?? "Curso"),
          status: String(course.status ?? ""),
        },
      },
    ];
  });
}

export function normalizeEnrollmentContact(item: Record<string, unknown>) {
  const user =
    item.user && typeof item.user === "object"
      ? (item.user as Record<string, unknown>)
      : {};
  const functionalData =
    user.functionalData && typeof user.functionalData === "object"
      ? (user.functionalData as Record<string, unknown>)
      : {};

  return {
    email:
      (typeof item.email === "string" && item.email) ||
      (typeof user.email === "string" ? user.email : undefined),
    registration:
      (typeof item.registration === "string" && item.registration) ||
      (typeof user.registration === "string" && user.registration) ||
      (typeof functionalData.registration === "string"
        ? functionalData.registration
        : undefined),
  };
}

export function normalizeEnrollmentDocuments(data: unknown) {
  const root =
    data && typeof data === "object"
      ? (data as Record<string, unknown>)
      : {};
  const source = Array.isArray(data)
    ? data
    : Array.isArray(root.documents)
      ? root.documents
      : [];
  return source.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    const id = item.id;
    if (typeof id !== "string" && typeof id !== "number") return [];
    return [
      {
        id: String(id),
        fileName: String(item.fileName ?? item.filename ?? item.name ?? "Documento"),
        category: String(item.category ?? ""),
        mimeType: typeof item.mimeType === "string" ? item.mimeType : undefined,
        size: typeof item.size === "number" ? item.size : undefined,
        createdAt: typeof item.createdAt === "string" ? item.createdAt : "",
      },
    ];
  });
}

export function normalizeEnrollmentQueue(data: unknown): {
  items: EnrollmentQueueItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
} {
  const root =
    data && typeof data === "object"
      ? (data as Record<string, unknown>)
      : {};
  const source = Array.isArray(root.items) ? root.items : [];
  const items = source.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    const course =
      item.course && typeof item.course === "object"
        ? (item.course as Record<string, unknown>)
        : {};
    const contact = normalizeEnrollmentContact(item);
    const id = Number(item.id);
    const courseId = Number(course.id);
    if (!Number.isInteger(id) || !Number.isInteger(courseId)) return [];
    const documents = normalizeEnrollmentDocuments(item.documents);
    return [
      {
        id,
        status: String(item.status ?? "PENDING"),
        name: String(item.name ?? "Aluno"),
        email: contact.email,
        registration: contact.registration,
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
        course: {
          id: courseId,
          title: String(course.title ?? "Curso"),
        },
        documents,
      },
    ];
  });
  const pagination =
    root.pagination && typeof root.pagination === "object"
      ? (root.pagination as Record<string, unknown>)
      : {};
  return {
    items,
    pagination: {
      page: Number(pagination.page ?? 1),
      limit: Number(pagination.limit ?? 20),
      total: Number(pagination.total ?? items.length),
      totalPages: Number(pagination.totalPages ?? 1),
    },
  };
}
