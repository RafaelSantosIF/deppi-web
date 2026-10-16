import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { RegisterForm } from "@/components/register-form";

export default async function RegisterPage() {
  if (await readSession()) redirect("/inicio");
  return <RegisterForm />;
}
