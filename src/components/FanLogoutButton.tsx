"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FanLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/auth/fan-logout", { method: "POST" });
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="btn-ghost"
      onClick={() => void logout()}
      disabled={loading}
    >
      {loading ? "..." : "Déconnexion"}
    </button>
  );
}
