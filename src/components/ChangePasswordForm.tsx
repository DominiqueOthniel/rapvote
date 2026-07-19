"use client";

import { useState } from "react";

type Props = {
  action: (
    formData: FormData,
  ) => Promise<{ ok: boolean; error?: string; message?: string }>;
};

export function ChangePasswordForm({ action }: Props) {
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
      setError(result.error ?? "Changement impossible");
      return;
    }
    setMessage(result.message ?? "Mot de passe mis à jour.");
    (document.getElementById("change-password-form") as HTMLFormElement | null)?.reset();
  }

  return (
    <form
      id="change-password-form"
      className="admin-card admin-form"
      action={onSubmit}
      style={{ maxWidth: "28rem" }}
    >
      <h2 className="admin-form-title">Changer le mot de passe</h2>
      <p className="muted">
        Saisis ton mot de passe actuel, puis le nouveau (4 caractères minimum).
      </p>

      <label className="field">
        <span>Mot de passe actuel</span>
        <input
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
        />
      </label>
      <label className="field">
        <span>Nouveau mot de passe</span>
        <input
          name="newPassword"
          type="password"
          required
          minLength={4}
          autoComplete="new-password"
        />
      </label>
      <label className="field">
        <span>Confirmer le nouveau</span>
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={4}
          autoComplete="new-password"
        />
      </label>

      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="phase-active-label">{message}</p> : null}

      <button className="btn-primary" type="submit" disabled={pending}>
        {pending ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
