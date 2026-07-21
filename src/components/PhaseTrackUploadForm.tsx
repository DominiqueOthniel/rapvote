"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  phaseId: string;
  hasTrack: boolean;
  defaultTitle?: string | null;
  defaultLyrics?: string | null;
};

export function PhaseTrackUploadForm({
  phaseId,
  hasTrack,
  defaultTitle,
  defaultLyrics,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(defaultTitle ?? "");
  const [lyrics, setLyrics] = useState(defaultLyrics ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  async function saveMetaOnly() {
    setLoading(true);
    setError(null);
    setProgress("Enregistrement des lyrics...");
    try {
      const res = await fetch("/api/tracks/lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phaseId,
          title: title.trim() || undefined,
          lyrics: lyrics.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Enregistrement impossible");
      setProgress("Lyrics enregistrées");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setProgress(null);

    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("audio") as HTMLInputElement;
    const file = fileInput.files?.[0];

    if (!file) {
      if (hasTrack) {
        await saveMetaOnly();
        return;
      }
      setError("Choisis un fichier audio");
      return;
    }

    const contentType =
      file.type ||
      (file.name.toLowerCase().endsWith(".m4a")
        ? "audio/mp4"
        : file.name.toLowerCase().endsWith(".wav")
          ? "audio/wav"
          : file.name.toLowerCase().endsWith(".ogg")
            ? "audio/ogg"
            : file.name.toLowerCase().endsWith(".webm")
              ? "audio/webm"
              : "audio/mpeg");

    setLoading(true);
    try {
      setProgress("Préparation de l'upload...");
      const prep = await fetch("/api/tracks/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phaseId,
          contentType,
          size: file.size,
        }),
      });
      const prepData = await prep.json();
      if (!prep.ok) {
        throw new Error(prepData.error ?? "Préparation upload impossible");
      }

      setProgress("Envoi du son vers Supabase...");
      const put = await fetch(prepData.signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
        },
        body: file,
      });
      if (!put.ok) {
        const detail = await put.text().catch(() => "");
        throw new Error(
          `Upload échoué (HTTP ${put.status})${detail ? `: ${detail.slice(0, 120)}` : ""}`,
        );
      }

      setProgress("Enregistrement...");
      const confirm = await fetch("/api/tracks/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phaseId,
          publicUrl: prepData.publicUrl,
          title: title.trim() || undefined,
          lyrics: lyrics.trim() || undefined,
        }),
      });
      const confirmData = await confirm.json();
      if (!confirm.ok) {
        throw new Error(confirmData.error ?? "Enregistrement impossible");
      }

      setProgress("OK");
      fileInput.value = "";
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload impossible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="phase-track-upload">
      <label className="field">
        <span>Titre (optionnel)</span>
        <input
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Freestyle final"
        />
      </label>
      <label className="field lyrics-field">
        <span>Lyrics</span>
        <textarea
          name="lyrics"
          className="lyrics-textarea"
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          rows={8}
          maxLength={12000}
          placeholder={"Colle ici les paroles...\n\nCouplet 1\n...\nRefrain"}
        />
        <span className="field-hint">
          Texte libre · visible à côté du player pour lire en écoutant
        </span>
      </label>
      <label className="field">
        <span>Fichier audio {hasTrack ? "(optionnel pour remplacer)" : ""}</span>
        <input
          className="file-input"
          name="audio"
          type="file"
          accept="audio/mpeg,audio/mp4,audio/wav,audio/webm,audio/ogg,.mp3,.m4a,.wav"
          required={!hasTrack}
        />
        <span className="field-hint">
          MP3, M4A, WAV · max 15 Mo · upload direct
          {hasTrack ? " · laisse vide pour garder le son actuel" : ""}
        </span>
      </label>
      {error ? <p className="error">{error}</p> : null}
      {progress && !error ? <p className="muted">{progress}</p> : null}
      <button className="btn-primary" type="submit" disabled={loading}>
        {loading
          ? "Envoi..."
          : hasTrack
            ? "Enregistrer son / lyrics"
            : "Uploader le son"}
      </button>
    </form>
  );
}
