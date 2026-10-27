import { redirect } from "next/navigation";
import { RolesPermissions } from "@/components/roles-permissions";
import { can } from "@/lib/permissions";
import { pageRequest, requireSession } from "@/lib/session";

export default async function PermissionsPage() {
  const session = await requireSession();
  if (!can(session.user, "manage-permissions")) redirect("/403");

  try {
    const data = await pageRequest<unknown>("/roles", "/permissoes");
    return <RolesPermissions initialData={data} />;
  } catch {
    return <RolesPermissions initialData={null} initialError />;
  }
}
