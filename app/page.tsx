import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";

export default async function RootPage() {
  redirect((await readSession()) ? "/inicio" : "/login");
}
