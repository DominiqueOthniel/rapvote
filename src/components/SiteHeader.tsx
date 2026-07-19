"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Accueil" },
  { href: "/inscription", label: "Inscription artiste" },
  { href: "/classement", label: "Classement" },
  { href: "/phases", label: "Phases" },
];

export function SiteHeader() {
  const pathname = usePathname();
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/jury") ||
    pathname.startsWith("/candidat")
  ) {
    return null;
  }

  return (
    <header className="site-header">
      <div className="shell site-header-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">FC</span>
          <span className="brand-name">For The Culture</span>
        </Link>
        <nav className="nav" aria-label="Navigation principale">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? "nav-link active" : "nav-link"}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
