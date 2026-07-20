"use client";

import { useState } from "react";

export type CandidateOption = {
  id: string;
  label: string;
};

type Props = {
  candidates: CandidateOption[];
  configured: boolean;
  action: (
    formData: FormData,
  ) => Promise<{ ok: boolean; error?: string }>;
};

export function PayoutForm({ candidates, configured, action }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setMessage(null);
    const result = await action(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "Versement impossible");
      return;
    }
    setMessage("Transfert Notch Pay initié.");
    (document.getElementById("payout-form") as HTMLFormElement | null)?.reset();
  }

  return (
    <form
      id="payout-form"
      action={onSubmit}
      className="admin-card admin-form"
      style={{ marginTop: "1.25rem" }}
    >
      <h2 className="admin-form-title">Nouveau versement</h2>
      <label className="field">
        <span>Artiste</span>
        <select name="candidateId" required defaultValue="">
          <option value="" disabled>
            Choisir…
          </option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Montant (XAF)</span>
        <input
          name="amountXaf"
          type="number"
          min={100}
          step={1}
          required
          placeholder="Ex: 5000"
        />
      </label>
      <label className="field">
        <span>Numéro de téléphone (optionnel)</span>
        <input
          name="phone"
          type="tel"
          placeholder="Laisse vide = numéro du profil"
        />
      </label>
      <label className="field">
        <span>Opérateur</span>
        <select name="operator" defaultValue="">
          <option value="">Auto (détection)</option>
          <option value="MTN">MTN (cm.mtn)</option>
          <option value="ORANGE">Orange (cm.orange)</option>
        </select>
      </label>

      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="phase-active-label">{message}</p> : null}

      <button className="btn-primary" type="submit" disabled={!configured || pending}>
        {pending ? "Envoi..." : "Envoyer via Notch Pay"}
      </button>
    </form>
  );
}
