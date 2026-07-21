"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  WHATSAPP_GROUP_LABEL,
  WHATSAPP_GROUP_URL,
} from "@/lib/community";

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
          <Image
            src="/logo.png"
            alt="For The Culture"
            width={40}
            height={40}
            className="brand-logo"
            priority
          />
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
          <a
            className="nav-link nav-whatsapp"
            href={WHATSAPP_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp
            <span className="sr-only"> · {WHATSAPP_GROUP_LABEL}</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
