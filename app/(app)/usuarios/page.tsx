import { redirect } from "next/navigation";
import { UsersManagement } from "@/components/users-management";
import { requireSession, pageRequest } from "@/lib/session";

function hasUserManagementAccess(role: string, permissions: string[]) {
  const normalized = role.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  return permissions.includes("manage-users") &&
    (normalized.includes("deppi") || normalized.includes("admin") || normalized.includes("administrador"));
}

export default async function UsersPage() {
  const session = await requireSession();
  if (!hasUserManagementAccess(session.user.role, session.user.permissions)) redirect("/403");

  try {
    const [users, roles] = await Promise.all([
      pageRequest<unknown>("/users", "/usuarios"),
      pageRequest<unknown>("/roles", "/usuarios"),
    ]);
    return <UsersManagement initialUsers={users} initialRoles={roles} />;
  } catch {
    return <UsersManagement initialUsers={null} initialRoles={null} initialError />;
  }
}
