"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

type Props = {
  action: (
    formData: FormData,
  ) => Promise<{ ok: boolean; error?: string; redirectTo?: string }>;
  registrationsOpen: boolean;
};

export function InscriptionForm({ action, registrationsOpen }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await action(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "Inscription impossible");
      return;
    }
    router.push(result.redirectTo ?? "/candidat");
    router.refresh();
  }

  if (!registrationsOpen) {
    return (
      <div className="admin-card">
        <h2 className="admin-form-title">Inscriptions fermées</h2>
        <p className="muted">
          L&apos;administration a terminé les inscriptions pour cette saison.
        </p>
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          Déjà inscrit ? <Link href="/candidat/login">Connexion artiste</Link>
        </p>
      </div>
    );
  }

  return (
    <form
      className="admin-card admin-form inscription-form"
      action={onSubmit}
      encType="multipart/form-data"
    >
      <h2 className="admin-form-title">Créer mon compte artiste</h2>
      <p className="muted">
        Inscris-toi puis gère toi-même ton profil (photo, bio, ville) dans ton
        espace candidat.
      </p>

      <label className="field">
        <span>Nom de scène</span>
        <input name="stageName" required placeholder="Ex: Cipher Joe" />
      </label>
      <label className="field">
        <span>Email</span>
        <input
          name="email"
          type="email"
          required
          placeholder="toi@email.com"
          autoComplete="email"
        />
      </label>
      <label className="field">
        <span>Mot de passe</span>
        <input
          name="password"
          type="password"
          required
          minLength={4}
          autoComplete="new-password"
        />
      </label>
      <label className="field">
        <span>Ville</span>
        <input name="city" placeholder="Douala" />
      </label>
      <label className="field">
        <span>Téléphone</span>
        <input name="phone" type="tel" placeholder="6XX XX XX XX" />
      </label>
      <label className="field">
        <span>Photo</span>
        <input
          className="file-input"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
        />
        <span className="field-hint">JPG, PNG ou WebP · max 4 Mo (optionnel)</span>
      </label>
      <label className="field">
        <span>Bio / univers</span>
        <textarea
          name="bio"
          rows={4}
          placeholder="Ton style, ta DA, ce qui te définit..."
        />
      </label>

      {error ? <p className="error">{error}</p> : null}

      <button className="btn-primary" type="submit" disabled={pending}>
        {pending ? "Création..." : "Créer mon compte"}
      </button>

      <p className="muted" style={{ marginTop: "0.85rem" }}>
        Déjà un compte ? <Link href="/candidat/login">Connexion</Link>
      </p>
    </form>
  );
}
