import { redirect } from "next/navigation";
import { getSession } from "../lib/session";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.type === "lab") redirect("/lab-dashboard");
  if (session.role === "APPLICANT") redirect("/industry");
  redirect("/workspace");
}
