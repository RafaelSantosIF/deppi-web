import type { CourseProfessor } from "./types";

export function normalizeCourseProfessors(data: unknown): CourseProfessor[] {
  const root =
    data && typeof data === "object"
      ? (data as Record<string, unknown>)
      : {};
  const source = Array.isArray(data)
    ? data
    : Array.isArray(root.professors)
      ? root.professors
      : [];
  return source.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    const id = Number(item.id);
    if (
      !Number.isInteger(id) ||
      id < 1 ||
      typeof item.name !== "string" ||
      item.active === false
    ) {
      return [];
    }
    return [{
      id,
      name: item.name,
      email: typeof item.email === "string" ? item.email : "",
      active: item.active !== false,
    }];
  });
}
