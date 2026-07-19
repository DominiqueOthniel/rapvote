import Link from "next/link";
import { redirect } from "next/navigation";
import { destroyJurySession, getJurySession } from "@/lib/auth";

async function logout() {
  "use server";
  await destroyJurySession();
  redirect("/jury/login");
}

export default async function JuryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jury = await getJurySession();

  return (
    <div className="admin-shell">
      <div className="brand admin-brand">
        <span className="brand-mark">FC</span>
        <span className="brand-name">ForTheCulture Jury</span>
      </div>
      <nav className="admin-nav">
        {jury ? (
          <>
            <span className="muted">{jury.name}</span>
            <Link className="btn-ghost" href="/jury">
              Notation
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
