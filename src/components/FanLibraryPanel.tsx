"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  useFanPlayer,
  type FanPlayerTrack,
} from "@/components/FanPlayerProvider";
import { formatVotes } from "@/lib/money";

export type LibraryItem = {
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

export type LibraryTab = "playlist" | "history";

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

function formatWhen(iso?: string) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return null;
  }
}

type ListProps = {
  items: LibraryItem[];
  mode: LibraryTab;
  onRemove?: (trackId: string) => void;
  compact?: boolean;
};

export function FanLibraryList({
  items,
  mode,
  onRemove,
  compact = false,
}: ListProps) {
  const { track, isPlaying, playTrack, toggle } = useFanPlayer();

  function onPlay(item: LibraryItem) {
    if (track?.id === item.id) {
      toggle();
      return;
    }
    playTrack(
      toPlayerTrack(item),
      items.map(toPlayerTrack),
    );
  }

  if (items.length === 0) return null;

  return (
    <ul className={`fan-lib-list${compact ? " is-compact" : ""}`}>
      {items.map((item, index) => {
        const active = track?.id === item.id;
        const playing = active && isPlaying;
        const when = formatWhen(
          mode === "playlist" ? item.savedAt : item.listenedAt,
        );

        return (
          <li key={item.id}>
            <div
              className={`fan-lib-row${active ? " is-active" : ""}${
                playing ? " is-playing" : ""
              }`}
            >
              <button
                type="button"
                className="fan-lib-play"
                onClick={() => onPlay(item)}
                aria-label={
                  playing ? `Pause ${item.title}` : `Écouter ${item.title}`
                }
              >
                <span className="fan-lib-num">
                  {playing ? "❚❚" : active ? "▶" : index + 1}
                </span>
                {item.candidatePhotoUrl ? (
                  <Image
                    src={item.candidatePhotoUrl}
                    alt=""
                    width={compact ? 44 : 52}
                    height={compact ? 44 : 52}
                    className="fan-lib-cover"
                  />
                ) : (
                  <span className="fan-lib-cover-fallback">
                    {item.candidateName.slice(0, 1)}
                  </span>
                )}
                <span className="fan-lib-meta">
                  <strong className="fan-lib-title">{item.title}</strong>
                  <span className="fan-lib-sub">
                    <Link
                      href={`/candidats/${item.candidateSlug}`}
                      className="fan-lib-artist"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.candidateName}
                    </Link>
                    <span className="muted">
                      {" · "}
                      {formatVotes(item.playCount)} écoutes
                    </span>
                  </span>
                  {when ? (
                    <span className="muted fan-lib-when">{when}</span>
                  ) : null}
                </span>
              </button>

              {mode === "playlist" && onRemove ? (
                <button
                  type="button"
                  className="btn-ghost fan-lib-remove"
                  onClick={() => onRemove(item.id)}
                >
                  Retirer
                </button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

type ViewProps = {
  compact?: boolean;
  onClose?: () => void;
  showHeader?: boolean;
};

export function FanLibraryView({
  compact = false,
  onClose,
  showHeader = true,
}: ViewProps) {
  const [tab, setTab] = useState<LibraryTab>("playlist");
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
    <div className={`fan-lib${compact ? " is-compact" : ""}`}>
      {showHeader ? (
        <div className="fan-lib-head">
          <div>
            <p className="muted">Tes sons</p>
            <h2 className="fan-lib-title-page">Ma bibliothèque</h2>
          </div>
          {onClose ? (
            <button type="button" className="btn-ghost" onClick={onClose}>
              Fermer
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="fan-lib-tabs" role="tablist" aria-label="Bibliothèque">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "playlist"}
          className={`fan-lib-tab${tab === "playlist" ? " is-active" : ""}`}
          onClick={() => setTab("playlist")}
        >
          Mes sons
          <span className="fan-lib-count">{playlist.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "history"}
          className={`fan-lib-tab${tab === "history" ? " is-active" : ""}`}
          onClick={() => setTab("history")}
        >
          Historique
          <span className="fan-lib-count">{history.length}</span>
        </button>
      </div>

      {loading ? <p className="muted">Chargement...</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!loading && !error && items.length === 0 ? (
        <div className="fan-lib-empty">
          <p>
            {tab === "playlist"
              ? "Aucun son sauvegardé."
              : "Pas encore d'écoutes comptées."}
          </p>
          <p className="muted">
            {tab === "playlist"
              ? "Touche l'étoile dans le lecteur pour ajouter un son ici."
              : "Écoute un son assez longtemps pour qu'il apparaisse."}
          </p>
        </div>
      ) : null}

      {!loading && !error ? (
        <FanLibraryList
          items={items}
          mode={tab}
          compact={compact}
          onRemove={
            tab === "playlist"
              ? (id) => void removeFromPlaylist(id)
              : undefined
          }
        />
      ) : null}
    </div>
  );
}

/** Panel compact ouvert depuis le lecteur. */
export function FanLibraryPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="fan-now-panel fan-library-panel">
      <FanLibraryView compact showHeader onClose={onClose} />
    </div>
  );
}
