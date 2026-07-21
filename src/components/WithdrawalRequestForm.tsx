"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  balanceDue: number;
  defaultPhone: string;
  action: (
    formData: FormData,
  ) => Promise<{ ok: boolean; error?: string }>;
};

export function WithdrawalRequestForm({
  balanceDue,
  defaultPhone,
  action,
}: Props) {
  const router = useRouter();
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
      setError(result.error ?? "Demande impossible");
      return;
    }
    setMessage("Demande envoyée à l'admin.");
    router.refresh();
  }

  if (balanceDue < 100) {
    return (
      <section className="admin-card">
        <h2 className="admin-form-title">Demande de retrait</h2>
        <p className="muted">
          Solde trop bas pour une demande (minimum 100 XAF disponible).
        </p>
      </section>
    );
  }

  return (
    <form action={onSubmit} className="admin-card admin-form">
      <h2 className="admin-form-title">Demande de retrait</h2>
      <p className="muted">
        Disponible : <strong>{balanceDue.toLocaleString("fr-FR")} XAF</strong>.
        L&apos;admin reçoit ta demande puis traite le versement.
      </p>
      <label className="field">
        <span>Montant à retirer (XAF)</span>
        <input
          name="amountXaf"
          type="number"
          min={100}
          max={balanceDue}
          step={1}
          required
          defaultValue={balanceDue}
        />
      </label>
      <label className="field">
        <span>Numéro de téléphone</span>
        <input
          name="phone"
          type="tel"
          required
          defaultValue={defaultPhone}
          placeholder="6XX XX XX XX"
        />
      </label>
      <label className="field">
        <span>Message pour l&apos;admin (optionnel)</span>
        <textarea
          name="message"
          rows={3}
          maxLength={400}
          placeholder="Ex: Orange Money, merci de verser cette semaine..."
        />
      </label>

      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="phase-active-label">{message}</p> : null}

      <button className="btn-primary" type="submit" disabled={pending}>
        {pending ? "Envoi..." : "Envoyer la demande"}
      </button>
    </form>
  );
}
