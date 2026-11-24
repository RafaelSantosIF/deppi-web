import type { CourseMaterial } from "./types";

export function normalizeCourseMaterials(data: unknown): CourseMaterial[] {
  const outer =
    data && typeof data === "object"
      ? (data as Record<string, unknown>)
      : {};
  const root =
    outer.data && typeof outer.data === "object"
      ? (outer.data as Record<string, unknown>)
      : outer;
  const source = Array.isArray(data)
    ? data
    : Array.isArray(root.files)
      ? root.files
      : Array.isArray(root.documents)
        ? root.documents
        : Array.isArray(root.items)
          ? root.items
          : [];

  return source.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    const id = item.id;
    if (typeof id !== "string" && typeof id !== "number") return [];
    if (!String(id).trim()) return [];
    return [
      {
        id: String(id),
        fileName: String(item.fileName ?? item.filename ?? item.name ?? "Arquivo"),
        mimeType:
          typeof item.mimeType === "string" ? item.mimeType : undefined,
        size: typeof item.size === "number" ? item.size : undefined,
        createdAt:
          typeof item.createdAt === "string" ? item.createdAt : undefined,
      },
    ];
  });
}

export function isCourseMaterialId(value: string) {
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value);
}
