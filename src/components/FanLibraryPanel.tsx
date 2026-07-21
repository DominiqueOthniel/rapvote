"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useFanPlayer, type FanPlayerTrack } from "@/components/FanPlayerProvider";

type LibraryItem = {
  id: string;
  title: string;
  audioUrl: string;
  lyrics: string | null;
  playCount: number;
  likeCount: number;
  candidateSlug: string;
  candidateName: string;
  candidatePhotoUrl: string | null;
  savedAt?: string;
  listenedAt?: string;
};

type Tab = "playlist" | "history";

function toPlayerTrack(item: LibraryItem): FanPlayerTrack {
  return {
    id: item.id,
    title: item.title,
    audioUrl: item.audioUrl,
    candidateSlug: item.candidateSlug,
    candidateName: item.candidateName,
    candidatePhotoUrl: item.candidatePhotoUrl,
    likeCount: item.likeCount,
    likedByFan: false,
    lyrics: item.lyrics,
  };
}

type Props = {
  onClose: () => void;
};

export function FanLibraryPanel({ onClose }: Props) {
  const { playTrack } = useFanPlayer();
  const [tab, setTab] = useState<Tab>("playlist");
  const [playlist, setPlaylist] = useState<LibraryItem[]>([]);
  const [history, setHistory] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pl, hi] = await Promise.all([
        fetch("/api/fan/playlist").then((r) => r.json()),
        fetch("/api/fan/history").then((r) => r.json()),
      ]);
      if (!pl.ok) throw new Error(pl.error ?? "Playlist indisponible");
      if (!hi.ok) throw new Error(hi.error ?? "Historique indisponible");
      setPlaylist(pl.items ?? []);
      setHistory(hi.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const items = tab === "playlist" ? playlist : history;

  function playItem(item: LibraryItem) {
    const queue = items.map(toPlayerTrack);
    playTrack(toPlayerTrack(item), queue);
  }

  async function removeFromPlaylist(trackId: string) {
    const res = await fetch("/api/fan/playlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId }),
    });
    if (!res.ok) return;
    setPlaylist((prev) => prev.filter((t) => t.id !== trackId));
  }

  return (
    <div className="fan-now-panel fan-library-panel">
      <div className="fan-now-panel-head">
        <strong>Ma bibliothèque</strong>
        <button type="button" className="btn-ghost" onClick={onClose}>
          Fermer
        </button>
      </div>

      <div className="fan-library-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "playlist"}
          className={`btn-ghost${tab === "playlist" ? " is-active" : ""}`}
          onClick={() => setTab("playlist")}
        >
          Mes sons
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "history"}
          className={`btn-ghost${tab === "history" ? " is-active" : ""}`}
          onClick={() => setTab("history")}
        >
          Historique
        </button>
      </div>

      {loading ? <p className="muted">Chargement...</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!loading && !error && items.length === 0 ? (
        <p className="muted">
          {tab === "playlist"
            ? "Aucun son sauvegardé. Ajoute-en depuis le lecteur."
            : "Pas encore d'écoutes comptées."}
        </p>
      ) : null}

      <ul className="fan-library-list">
        {items.map((item) => (
          <li key={item.id} className="fan-library-row">
            <button
              type="button"
              className="fan-library-play"
              onClick={() => playItem(item)}
            >
              {item.candidatePhotoUrl ? (
                <Image
                  src={item.candidatePhotoUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="fan-library-cover"
                />
              ) : (
                <span className="fan-library-cover-fallback">
                  {item.candidateName.slice(0, 1)}
                </span>
              )}
              <span className="fan-library-meta">
                <strong>{item.title}</strong>
                <span className="muted">{item.candidateName}</span>
              </span>
            </button>
            {tab === "playlist" ? (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => void removeFromPlaylist(item.id)}
              >
                Retirer
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
