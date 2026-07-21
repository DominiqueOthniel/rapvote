"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { FanLibraryPanel } from "@/components/FanLibraryPanel";
import { FanPlayerComments } from "@/components/FanPlayerComments";
import { useFanPlayer } from "@/components/FanPlayerProvider";
import { SyncedLyrics } from "@/components/SyncedLyrics";

type Panel = "lyrics" | "comments" | "library" | null;

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function FanNowPlayingBar() {
  const {
    track,
    isPlaying,
    currentTime,
    duration,
    toggle,
    seek,
    playNext,
    playPrev,
  } = useFanPlayer();
  const [panel, setPanel] = useState<Panel>(null);
  const [saved, setSaved] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);

  useEffect(() => {
    setPanel(null);
    setSaved(false);
  }, [track?.id]);

  useEffect(() => {
    if (!track?.id) return;
    let cancelled = false;
    void fetch("/api/fan/playlist")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data.ok) return;
        const ids = (data.items as { id: string }[]).map((i) => i.id);
        setSaved(ids.includes(track.id));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [track?.id]);

  if (!track) return null;

  const trackId = track.id;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const hasLyrics = Boolean(track.lyrics?.trim());
  const panelOpen = panel !== null;

  function togglePanel(next: Panel) {
    setPanel((current) => (current === next ? null : next));
  }

  function openLibrary() {
    // Sur la page Sons: bascule l'onglet. Sinon: panneau lecteur.
    const onHome = window.location.pathname === "/";
    if (onHome) {
      window.dispatchEvent(new Event("ftc:open-library"));
      setPanel(null);
      return;
    }
    togglePanel("library");
  }

  async function toggleSave() {
    if (saveBusy) return;
    setSaveBusy(true);
    try {
      const res = await fetch("/api/fan/playlist", {
        method: saved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaved(Boolean(data.saved));
      }
    } catch {
      // ignore
    } finally {
      setSaveBusy(false);
    }
  }

  return (
    <div
      className={`fan-now-playing${panelOpen ? " has-panel" : ""}`}
      role="region"
      aria-label="Lecteur"
    >
      {panel === "library" ? (
        <FanLibraryPanel onClose={() => setPanel(null)} />
      ) : null}

      {panel === "lyrics" && hasLyrics ? (
        <div className="fan-now-panel">
          <div className="fan-now-panel-head">
            <strong>Lyrics</strong>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setPanel(null)}
            >
              Fermer
            </button>
          </div>
          <SyncedLyrics
            lyrics={track.lyrics!}
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            onSeek={seek}
          />
        </div>
      ) : null}

      {panel === "comments" ? (
        <div className="fan-now-panel fan-now-panel-comments">
          <div className="fan-now-panel-head">
            <strong>Commentaires</strong>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setPanel(null)}
            >
              Fermer
            </button>
          </div>
          <FanPlayerComments trackId={track.id} />
        </div>
      ) : null}

      <div className="fan-now-playing-inner">
        <Link
          href={`/candidats/${track.candidateSlug}`}
          className="fan-now-cover"
        >
          {track.candidatePhotoUrl ? (
            <Image
              src={track.candidatePhotoUrl}
              alt=""
              width={56}
              height={56}
              className="fan-now-cover-img"
            />
          ) : (
            <span className="fan-now-cover-fallback" aria-hidden="true">
              {track.candidateName.slice(0, 1)}
            </span>
          )}
        </Link>

        <div className="fan-now-meta">
          <strong className="fan-now-title">{track.title}</strong>
          <Link
            href={`/candidats/${track.candidateSlug}`}
            className="fan-now-artist"
          >
            {track.candidateName}
          </Link>
        </div>

        <div className="fan-now-tools">
          <button
            type="button"
            className="fan-now-btn fan-now-tool"
            onClick={openLibrary}
            aria-label="Ma bibliothèque"
            title="Ma bibliothèque"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
              <path
                d="M4 6h16M4 12h16M4 18h10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className={`fan-now-btn fan-now-tool${saved ? " is-on" : ""}`}
            onClick={() => void toggleSave()}
            disabled={saveBusy}
            aria-label={saved ? "Retirer de Mes sons" : "Ajouter à Mes sons"}
            title={saved ? "Dans Mes sons" : "Ajouter à Mes sons"}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
              <path
                d="M12 17.3l-5.4 3 1.4-6L3.5 9.9l6.1-.5L12 3.8l2.4 5.6 6.1.5-4.5 4.4 1.4 6z"
                fill={saved ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {hasLyrics ? (
            <button
              type="button"
              className={`fan-now-btn fan-now-tool${
                panel === "lyrics" ? " is-on" : ""
              }`}
              onClick={() => togglePanel("lyrics")}
              aria-pressed={panel === "lyrics"}
              aria-label="Lyrics"
              title="Lyrics"
            >
              Aa
            </button>
          ) : null}
          <button
            type="button"
            className={`fan-now-btn fan-now-tool${
              panel === "comments" ? " is-on" : ""
            }`}
            onClick={() => togglePanel("comments")}
            aria-pressed={panel === "comments"}
            aria-label="Commentaires"
            title="Commentaires"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
              <path
                d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="fan-now-transport">
          <button
            type="button"
            className="fan-now-btn"
            onClick={playPrev}
            aria-label="Piste précédente"
          >
            ‹
          </button>
          <button
            type="button"
            className="fan-now-btn fan-now-play"
            onClick={toggle}
            aria-label={isPlaying ? "Pause" : "Lecture"}
          >
            {isPlaying ? "❚❚" : "▶"}
          </button>
          <button
            type="button"
            className="fan-now-btn"
            onClick={playNext}
            aria-label="Piste suivante"
          >
            ›
          </button>
        </div>

        <div className="fan-now-progress">
          <span className="muted fan-now-time">{formatTime(currentTime)}</span>
          <input
            type="range"
            className="fan-now-range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Progression"
            style={{ "--progress": `${progress}%` } as CSSProperties}
          />
          <span className="muted fan-now-time">{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
