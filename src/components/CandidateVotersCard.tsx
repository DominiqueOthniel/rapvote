"use client";

import { useEffect, useState } from "react";
import { formatVotes } from "@/lib/money";

type VoterRow = {
  id: string;
  voterName: string | null;
  votesCount: number;
  when: string;
  phaseLabel: string | null;
};

type Props = {
  candidateId: string;
  voters: VoterRow[];
};

const storageKey = (candidateId: string) =>
  `ftc-hide-voters-${candidateId}`;

export function CandidateVotersCard({ candidateId, voters }: Props) {
  const [hidden, setHidden] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(storageKey(candidateId)) === "1");
    } catch {
      // ignore
    }
    setReady(true);
  }, [candidateId]);

  function toggle() {
    setHidden((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey(candidateId), next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  if (!ready) {
    return (
      <section className="admin-card candidate-voters">
        <h2 className="admin-form-title">Qui a voté pour toi</h2>
        <p className="muted">Chargement...</p>
      </section>
    );
  }

  return (
    <section className="admin-card candidate-voters">
      <div className="candidate-voters-head">
        <h2 className="admin-form-title">Qui a voté pour toi</h2>
        <button
          type="button"
          className="btn-ghost"
          onClick={toggle}
          aria-pressed={hidden}
        >
          {hidden ? "Afficher" : "Masquer"}
        </button>
      </div>

      {hidden ? (
        <p className="muted">
          Liste masquée · {voters.length} vote
          {voters.length > 1 ? "s" : ""} enregistré
          {voters.length > 1 ? "s" : ""}.
        </p>
      ) : voters.length === 0 ? (
        <p className="muted">Aucun vote confirmé pour l&apos;instant.</p>
      ) : (
        <ul className="voter-list">
          {voters.map((tx) => (
            <li key={tx.id} className="voter-row">
              <div className="voter-main">
                <strong>{tx.voterName?.trim() || "Fan anonyme"}</strong>
                <span className="muted">
                  {formatVotes(tx.votesCount)} vote
                  {tx.votesCount > 1 ? "s" : ""}
                  {tx.phaseLabel ? ` · ${tx.phaseLabel}` : ""}
                </span>
              </div>
              <span className="muted voter-when">
                {new Date(tx.when).toLocaleString("fr-FR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
