"use client";

import { useRouter } from "next/navigation";

type Props = {
  fallbackHref?: string;
  label?: string;
};

export function BackNav({
  fallbackHref = "/#artistes",
  label = "Retour aux artistes",
}: Props) {
  const router = useRouter();

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  }

  return (
    <nav className="page-back-nav" aria-label="Navigation retour">
      <button type="button" className="page-back-btn" onClick={goBack}>
        <span className="page-back-arrow" aria-hidden="true">
          ←
        </span>
        <span>{label}</span>
      </button>
    </nav>
  );
}
