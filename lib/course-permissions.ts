import { can } from "./permissions";
import type { SessionUser } from "./types";

const statusTransitions: Record<string, string[]> = {
  DRAFT: ["PENDING_APPROVAL"],
  PENDING_APPROVAL: ["APPROVED", "REJECTED"],
  APPROVED: ["PUBLISHED", "REJECTED"],
  PUBLISHED: ["CLOSED"],
  REJECTED: ["PENDING_APPROVAL"],
  CLOSED: [],
};

const ownerStatusTransitions: Record<string, string[]> = {
  DRAFT: ["PENDING_APPROVAL"],
  APPROVED: ["PUBLISHED"],
  PUBLISHED: ["CLOSED"],
  REJECTED: ["PENDING_APPROVAL"],
};

export function canAssignCourseResponsible(user: SessionUser) {
  const role = user.role
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return (
    can(user, "manage-courses") &&
    ["deppi", "adm", "administrador", "admin"].includes(role)
  );
}

export function courseStatusActions(
  status: string,
  canManage: boolean,
  isOwner: boolean,
) {
  if (canManage) return statusTransitions[status] ?? [];
  return isOwner ? ownerStatusTransitions[status] ?? [] : [];
}
