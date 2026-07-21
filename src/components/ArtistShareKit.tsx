"use client";

import { useMemo, useState } from "react";

type Props = {
  slug: string;
  stageName: string;
};

export function ArtistShareKit({ slug, stageName }: Props) {
  const [format, setFormat] = useState<"square" | "wide">("square");
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pageUrl = useMemo(() => {
    if (typeof window === "undefined") return `/candidats/${slug}`;
    return `${window.location.origin}/candidats/${slug}`;
  }, [slug]);

  const imageUrl = useMemo(() => {
    const q = format === "wide" ? "?format=wide" : "";
    if (typeof window === "undefined") return `/api/share/artist/${slug}${q}`;
    return `${window.location.origin}/api/share/artist/${slug}${q}`;
  }, [slug, format]);

  const shareText = `${stageName} · Mon son est en ligne · vote ici ${pageUrl}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setHint("Lien copié");
    } catch {
      setHint("Copie impossible");
    }
  }

  async function copyImageLink() {
    try {
      await navigator.clipboard.writeText(imageUrl);
      setHint("Lien image copié");
    } catch {
      setHint("Copie impossible");
    }
  }

  function openWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function downloadImage() {
    setBusy(true);
    setHint(null);
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error("Image indisponible");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${slug}-share-${format}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      setHint("Image téléchargée");
    } catch {
      setHint("Téléchargement impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-card artist-share-kit">
      <h2 className="admin-form-title">Carte de partage</h2>
      <p className="muted">
        Image générée pour WhatsApp / stories · texte « Mon son est en ligne ·
        vote ici ».
      </p>

      <div className="artist-share-formats">
        <button
          type="button"
          className={`btn-ghost${format === "square" ? " is-active" : ""}`}
          onClick={() => setFormat("square")}
        >
          Carré (stories)
        </button>
        <button
          type="button"
          className={`btn-ghost${format === "wide" ? " is-active" : ""}`}
          onClick={() => setFormat("wide")}
        >
          Large (lien)
        </button>
      </div>

      <div className={`artist-share-preview is-${format}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={imageUrl}
          src={imageUrl}
          alt={`Carte de partage ${stageName}`}
          className="artist-share-img"
        />
      </div>

      <div className="artist-share-actions">
        <button type="button" className="btn-primary" onClick={openWhatsApp}>
          Partager WhatsApp
        </button>
        <button type="button" className="btn-secondary" onClick={() => void copyLink()}>
          Copier le lien vote
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={busy}
          onClick={() => void downloadImage()}
        >
          {busy ? "Préparation..." : "Télécharger l'image"}
        </button>
        <button type="button" className="btn-ghost" onClick={() => void copyImageLink()}>
          Copier lien image
        </button>
      </div>

      {hint ? <p className="muted">{hint}</p> : null}
    </section>
  );
}
