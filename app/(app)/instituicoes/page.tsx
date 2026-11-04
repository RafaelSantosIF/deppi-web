import { redirect } from "next/navigation";
import { InstitutionsManagement } from "@/components/institutions-management";
import { requireSession, pageRequest } from "@/lib/session";

export default async function InstitutionsPage() {
  const session = await requireSession();
  if (!session.user.permissions.includes("manage-institutions")) redirect("/403");

  let institutions: unknown = null;
  let initialError = false;
  try {
    institutions = await pageRequest<unknown>("/institutions", "/instituicoes");
  } catch {
    initialError = true;
  }
  return (
    <InstitutionsManagement
      initialInstitutions={institutions}
      initialError={initialError}
    />
  );
}
