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
  candidateShareXaf: number;
  adminShareXaf: number;
  candidate: { stageName: string; slug: string };
};

function SuccessInner() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");
  const [status, setStatus] = useState<"loading" | "paid" | "pending" | "failed">("loading");
  const [tx, setTx] = useState<Tx | null>(null);

  useEffect(() => {
    if (!ref) return;
    let alive = true;

    async function check() {
      const res = await fetch(`/api/vote/status?ref=${ref}`);
      const data = await res.json();
      if (!alive) return;
      if (data.status === "paid") {
        setStatus("paid");
        setTx(data.transaction);
      } else if (data.status === "failed") {
        setStatus("failed");
      } else {
        setStatus("pending");
        setTimeout(check, 3000);
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
          Valide sur ton téléphone (Orange Money / MTN Money). On actualise
          automatiquement.
        </p>
      ) : null}

      {status === "paid" && tx ? (
        <div className="admin-card success-card">
          <p>
            <strong>{formatVotes(tx.votesCount)}</strong> vote(s) pour{" "}
            <strong>{tx.candidate.stageName}</strong>
          </p>
          <p className="muted">Montant: {formatXaf(tx.amountXaf)}</p>
          <p className="muted">Part artiste: {formatXaf(tx.candidateShareXaf)}</p>
          <p className="muted">Part orga: {formatXaf(tx.adminShareXaf)}</p>
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
