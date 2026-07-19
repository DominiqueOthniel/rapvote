import Link from "next/link";
import { redirect } from "next/navigation";
import { destroyAdminSession, getAdminSession } from "@/lib/auth";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/candidats", label: "Candidats" },
  { href: "/admin/phases", label: "Phases" },
  { href: "/admin/paiements", label: "Paiements" },
  { href: "/admin/versements", label: "Versements" },
  { href: "/admin/compte", label: "Mon compte" },
  { href: "/jury/login", label: "Espace jury" },
];

async function logout() {
  "use server";
  await destroyAdminSession();
  redirect("/admin/login");
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminSession();

  return (
    <div className="admin-shell">
      <div className="brand admin-brand">
        <span className="brand-mark">FC</span>
        <span className="brand-name">ForTheCulture Admin</span>
      </div>
      <nav className="admin-nav">
        {admin
          ? links.map((link) => (
              <Link key={link.href} className="btn-ghost" href={link.href}>
                {link.label}
              </Link>
            ))
          : null}
        {admin ? (
          <form action={logout}>
            <button className="btn-secondary" type="submit">
              Déconnexion
            </button>
          </form>
        ) : null}
        <Link className="btn-secondary" href="/">
          Site public
        </Link>
      </nav>
      {children}
    </div>
  );
}
