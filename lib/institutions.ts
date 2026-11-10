import type { Institution } from "./types";

export function normalizeInstitutions(data: unknown): Institution[] {
  const root =
    data && typeof data === "object"
      ? (data as Record<string, unknown>)
      : {};
  const source = Array.isArray(data)
    ? data
    : Array.isArray(root.institutions)
      ? root.institutions
      : [];
  return source.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    const id = Number(item.id);
    if (!Number.isInteger(id) || id < 1 || typeof item.name !== "string") {
      return [];
    }
    const count =
      item._count && typeof item._count === "object"
        ? (item._count as Record<string, unknown>).departments
        : undefined;
    return [{
      id,
      name: item.name,
      cnpj: String(item.cnpj ?? ""),
      acronym: typeof item.acronym === "string" ? item.acronym : null,
      city: typeof item.city === "string" ? item.city : null,
      state: typeof item.state === "string" ? item.state : null,
      active: item.active !== false,
      _count: typeof count === "number" ? { departments: count } : undefined,
    }];
  });
}
