import Link from "next/link";
import { destroyCandidateSession, getCandidateSession } from "@/lib/auth";
import { BrandMark } from "@/components/BrandMark";
import { redirect } from "next/navigation";

async function logout() {
  "use server";
  await destroyCandidateSession();
  redirect("/candidat/login");
}

export default async function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const candidate = await getCandidateSession();

  return (
    <div className="admin-shell">
      <BrandMark label="Espace artiste" />
      <nav className="admin-nav">
        {candidate ? (
          <>
            <span className="muted">{candidate.stageName}</span>
            <Link className="btn-ghost" href="/candidat">
              Mon profil
            </Link>
            <form action={logout}>
              <button className="btn-secondary" type="submit">
                Déconnexion
              </button>
            </form>
          </>
        ) : null}
        <Link className="btn-secondary" href="/">
          Site public
        </Link>
      </nav>
      {children}
    </div>
  );
}
