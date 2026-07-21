"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatXaf } from "@/lib/money";
import {
  MAX_CUSTOM_VOTES,
  priceForVotes,
} from "@/lib/vote-packs";

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
  freeVotes?: number;
  fanName?: string | null;
  fanPhone?: string | null;
};

type Mode = "pack" | "custom";

export function VoteForm({
  candidateId,
  candidateName,
  phaseId,
  packages,
  freeVotes = 0,
  fanName = null,
  fanPhone = null,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("pack");
  const [packageId, setPackageId] = useState(packages[0]?.id ?? "");
  const [customVotes, setCustomVotes] = useState("15");
  const [voterName, setVoterName] = useState(fanName ?? "");
  const [phone, setPhone] = useState(fanPhone ?? "");
  const [operator, setOperator] = useState<"ORANGE" | "MTN">("ORANGE");
  const [loading, setLoading] = useState(false);
  const [freeLoading, setFreeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freeLeft, setFreeLeft] = useState(freeVotes);

  const customCount = Math.floor(Number(customVotes));
  const customPrice = useMemo(
    () =>
      Number.isFinite(customCount) && customCount >= 1
        ? priceForVotes(customCount)
        : 0,
    [customCount],
  );

  const selectedPack = packages.find((p) => p.id === packageId);
  const summary =
    mode === "custom"
      ? Number.isFinite(customCount) && customCount >= 1
        ? `${customCount} vote${customCount > 1 ? "s" : ""} · ${formatXaf(customPrice)}`
        : "Choisis un nombre de votes"
      : selectedPack
        ? `${selectedPack.label} · ${formatXaf(selectedPack.priceXaf)}`
        : "Choisis un pack";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === "custom") {
      if (!Number.isFinite(customCount) || customCount < 1) {
        setError("Entre un nombre de votes valide (minimum 1).");
        setLoading(false);
        return;
      }
      if (customCount > MAX_CUSTOM_VOTES) {
        setError(`Maximum ${MAX_CUSTOM_VOTES} votes par paiement.`);
        setLoading(false);
        return;
      }
    } else if (!packageId) {
      setError("Choisis un pack de votes.");
      setLoading(false);
      return;
    }

    const name = voterName.trim();
    if (name.length < 2) {
      setError("Indique ton nom ou pseudo (2 caractères minimum).");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId,
          phaseId,
          voterName: name,
          phone,
          operator,
          ...(mode === "custom"
            ? { customVotes: customCount }
            : { packageId }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur de paiement");
        setLoading(false);
        return;
      }
      if (
        typeof data.authorizationUrl === "string" &&
        data.authorizationUrl.startsWith("http")
      ) {
        window.location.href = data.authorizationUrl;
        return;
      }
      router.push(data.redirect);
    } catch {
      setError("Connexion impossible. Réessaie.");
      setLoading(false);
    }
  }

  async function onFreeVote() {
    setFreeLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vote/free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, phaseId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Vote gratuit impossible");
        setFreeLoading(false);
        return;
      }
      if (typeof data.engagement?.freeVotes === "number") {
        setFreeLeft(data.engagement.freeVotes);
      } else {
        setFreeLeft((n) => Math.max(0, n - 1));
      }
      if (data.engagement) {
        window.dispatchEvent(
          new CustomEvent("ftc:fan-engagement", { detail: data.engagement }),
        );
      }
      router.refresh();
    } catch {
      setError("Connexion impossible. Réessaie.");
    } finally {
      setFreeLoading(false);
    }
  }

  return (
    <form className="vote-form" onSubmit={onSubmit}>
      <h2>Voter pour {candidateName}</h2>
      <p className="muted">
        Paiement via Notch Pay · 50% artiste · 50% organisation.
      </p>

      {freeLeft > 0 ? (
        <div className="vote-free-box">
          <div>
            <strong>Vote gratuit</strong>
            <p className="muted">
              Tu as {freeLeft} vote{freeLeft > 1 ? "s" : ""} offert
              {freeLeft > 1 ? "s" : ""} (10 écoutes).
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            disabled={freeLoading || loading}
            onClick={() => void onFreeVote()}
          >
            {freeLoading ? "Envoi..." : "Offrir 1 vote gratuit"}
          </button>
        </div>
      ) : null}

      <div className="vote-mode-tabs">
        <button
          type="button"
          className={mode === "pack" ? "vote-mode-tab active" : "vote-mode-tab"}
          onClick={() => setMode("pack")}
        >
          Packs
        </button>
        <button
          type="button"
          className={
            mode === "custom" ? "vote-mode-tab active" : "vote-mode-tab"
          }
          onClick={() => setMode("custom")}
        >
          Nombre libre
        </button>
      </div>

      {mode === "pack" ? (
        <div className="pack-grid pack-grid-dense">
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
      ) : (
        <div className="vote-custom-box">
          <label className="field">
            <span>Combien de votes ?</span>
            <input
              type="number"
              min={1}
              max={MAX_CUSTOM_VOTES}
              step={1}
              value={customVotes}
              onChange={(e) => setCustomVotes(e.target.value)}
              required={mode === "custom"}
              placeholder="Ex: 15"
            />
            <span className="field-hint">
              De 1 à {MAX_CUSTOM_VOTES} · tarif dégressif selon le volume
            </span>
          </label>
          <div className="vote-custom-preview">
            <span className="muted">Total à payer</span>
            <strong>
              {customPrice > 0 ? formatXaf(customPrice) : "—"}
            </strong>
          </div>
        </div>
      )}

      <p className="vote-summary">{summary}</p>

      <label className="field">
        <span>Ton nom ou pseudo</span>
        <input
          type="text"
          name="voterName"
          placeholder="Ex: Fan de Douala"
          value={voterName}
          onChange={(e) => setVoterName(e.target.value)}
          maxLength={60}
          required
          autoComplete="nickname"
        />
      </label>

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
        <span>Numéro de téléphone</span>
        <input
          type="tel"
          placeholder="6XX XXX XXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </label>

      {error ? <p className="error">{error}</p> : null}

      <button
        className="btn-primary"
        type="submit"
        disabled={
          loading ||
          (mode === "pack" ? !packageId : customPrice <= 0)
        }
      >
        {loading ? "Traitement..." : "Payer et voter"}
      </button>
    </form>
  );
}
