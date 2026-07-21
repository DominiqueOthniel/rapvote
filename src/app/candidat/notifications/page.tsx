import { redirect } from "next/navigation";
import { getCandidateSession } from "@/lib/auth";
import { CandidateNotificationsPage } from "@/components/CandidateNotificationsPage";

export default async function CandidateNotificationsRoute() {
  const candidate = await getCandidateSession();
  if (!candidate) redirect("/candidat/login");

  return <CandidateNotificationsPage />;
}
