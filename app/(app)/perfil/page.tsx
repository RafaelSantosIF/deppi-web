import { ProfileForms } from "@/components/profile-forms";
import { pageRequest } from "@/lib/session";
import type { UserProfile } from "@/lib/types";

export default async function ProfilePage() {
  const profile = await pageRequest<UserProfile>("/users/me", "/perfil");
  return (
    <>      
      <ProfileForms profile={profile} />
    </>
  );
}
