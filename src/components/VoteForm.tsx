"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatXaf } from "@/lib/money";

type VotePackage = {
  id: string;
  label: string;
  votesCount: number;
  priceXaf: number;
};

type Props = {
  candidateId: string;
  candidateName: string;
  phaseId: string;
  packages: VotePackage[];
};

export function VoteForm({ candidateId, candidateName, phaseId, packages }: Props) {
  const router = useRouter();
  const [packageId, setPackageId] = useState(packages[0]?.id ?? "");
  const [phone, setPhone] = useState("");
  const [operator, setOperator] = useState<"ORANGE" | "MTN">("ORANGE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId,
          packageId,
          phaseId,
          phone,
          operator,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur de paiement");
        setLoading(false);
        return;
      }
      router.push(data.redirect);
    } catch {
      setError("Connexion impossible. Réessaie.");
      setLoading(false);
    }
  }

  return (
    <form className="vote-form" onSubmit={onSubmit}>
      <h2>Voter pour {candidateName}</h2>
      <p className="muted">
        Paiement via Notch Pay · 50% artiste · 50% organisation.
      </p>

      <div className="pack-grid">
        {packages.map((pack) => (
          <button
            key={pack.id}
            type="button"
            className={packageId === pack.id ? "pack active" : "pack"}
            onClick={() => setPackageId(pack.id)}
          >
            <strong>{pack.label}</strong>
            <span>{formatXaf(pack.priceXaf)}</span>
          </button>
        ))}
      </div>

      <label className="field">
        <span>Opérateur</span>
        <div className="operator-row">
          <button
            type="button"
            className={operator === "ORANGE" ? "op orange active" : "op orange"}
            onClick={() => setOperator("ORANGE")}
          >
            Orange Money
          </button>
          <button
            type="button"
            className={operator === "MTN" ? "op mtn active" : "op mtn"}
            onClick={() => setOperator("MTN")}
          >
            MTN Money
          </button>
        </div>
      </label>

      <label className="field">
        <span>Numéro Mobile Money</span>
        <input
          type="tel"
          placeholder="6XX XXX XXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </label>

      {error ? <p className="error">{error}</p> : null}

      <button className="btn-primary" type="submit" disabled={loading || !packageId}>
        {loading ? "Traitement..." : "Payer et voter"}
      </button>
    </form>
  );
}
