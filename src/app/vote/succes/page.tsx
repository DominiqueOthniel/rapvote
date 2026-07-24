"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { formatVotes, formatXaf } from "@/lib/money";

type Tx = {
  reference: string;
  status: string;
  votesCount: number;
  amountXaf: number;
  candidate: { stageName: string; slug: string };
};

function SuccessInner() {
  const searchParams = useSearchParams();
  // Notch peut renvoyer ref, reference ou trxref selon le callback.
  const ref =
    searchParams.get("ref") ??
    searchParams.get("reference") ??
    searchParams.get("trxref");
  const [status, setStatus] = useState<"loading" | "paid" | "pending" | "failed">(
    "loading",
  );
  const [tx, setTx] = useState<Tx | null>(null);

  useEffect(() => {
    if (!ref) return;
    let alive = true;
    let attempts = 0;

    async function check() {
      attempts += 1;
      const res = await fetch(`/api/vote/status?ref=${encodeURIComponent(ref!)}`);
      const data = await res.json();
      if (!alive) return;
      if (data.status === "paid") {
        setStatus("paid");
        setTx(data.transaction);
        return;
      }
      if (data.status === "failed") {
        setStatus("failed");
        return;
      }
      setStatus("pending");
      // Poll plus longtemps (jusqu'à ~5 min) pour ne pas rater la confirmation.
      if (attempts < 100) {
        setTimeout(check, attempts < 20 ? 2500 : 4000);
      }
    }

    check();
    return () => {
      alive = false;
    };
  }, [ref]);

  if (!ref) {
    return (
      <main className="shell section">
        <h1 className="page-title">Référence manquante</h1>
      </main>
    );
  }

  return (
    <main className="shell section">
      <p className="muted">Référence {ref}</p>
      <h1 className="page-title">
        {status === "paid"
          ? "Vote confirmé"
          : status === "failed"
            ? "Paiement échoué"
            : "Paiement en cours"}
      </h1>

      {status === "pending" || status === "loading" ? (
        <p className="muted">
          Valide sur ton téléphone (Orange Money / MTN Money). Dès que Notch
          confirme le paiement, les votes sont ajoutés automatiquement.
        </p>
      ) : null}

      {status === "paid" && tx ? (
        <div className="admin-card success-card">
          <p>
            <strong>{formatVotes(tx.votesCount)}</strong> vote(s) pour{" "}
            <strong>{tx.candidate.stageName}</strong>
          </p>
          <p className="muted">Montant: {formatXaf(tx.amountXaf)}</p>
          <div className="success-actions">
            <Link className="btn-primary" href={`/candidats/${tx.candidate.slug}`}>
              Retour artiste
            </Link>
            <Link className="btn-secondary" href="/classement">
              Classement
            </Link>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default function VoteSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="shell section">
          <h1 className="page-title">Chargement...</h1>
        </main>
      }
    >
      <SuccessInner />
    </Suspense>
  );
}
