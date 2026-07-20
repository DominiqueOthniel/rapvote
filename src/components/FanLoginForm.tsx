"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  onLoggedIn?: () => void;
};

export function FanLoginForm({ onLoggedIn }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/fan-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Connexion impossible");
        setLoading(false);
        return;
      }
      onLoggedIn?.();
      router.refresh();
    } catch {
      setError("Connexion impossible. Réessaie.");
      setLoading(false);
    }
  }

  return (
    <form className="fan-login-form" onSubmit={onSubmit}>
      <p className="muted">
        Connexion rapide pour commenter : nom + numéro, sans mot de passe.
      </p>
      <label className="field">
        <span>Ton prénom / pseudo</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={60}
          placeholder="Ex: Junior"
        />
      </label>
      <label className="field">
        <span>Numéro Mobile Money</span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          placeholder="6XX XXX XXX"
        />
      </label>
      {error ? <p className="error">{error}</p> : null}
      <button className="btn-primary" type="submit" disabled={loading}>
        {loading ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}
