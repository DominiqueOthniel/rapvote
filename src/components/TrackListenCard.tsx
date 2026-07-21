"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatVotes } from "@/lib/money";

type Props = {
  trackId: string;
  title: string;
  phaseLabel: string;
  audioUrl: string;
  lyrics: string | null;
  playCount: number;
  downloadCount: number;
  likeCount: number;
  likedByFan: boolean;
  fanLoggedIn: boolean;
};

export function TrackListenCard({
  trackId,
  title,
  phaseLabel,
  audioUrl,
  lyrics,
  playCount: initialPlays,
  downloadCount: initialDownloads,
  likeCount: initialLikes,
  likedByFan,
  fanLoggedIn,
}: Props) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const countedPlay = useRef(false);
  const [plays, setPlays] = useState(initialPlays);
  const [downloads, setDownloads] = useState(initialDownloads);
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(likedByFan);
  const [busyLike, setBusyLike] = useState(false);
  const [likeHint, setLikeHint] = useState<string | null>(null);

  const hasLyrics = Boolean(lyrics?.trim());

  async function registerPlay() {
    if (countedPlay.current) return;
    const key = `ftc-play-${trackId}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(key)) {
      countedPlay.current = true;
      return;
    }
    countedPlay.current = true;
    try {
      sessionStorage.setItem(key, "1");
    } catch {
      // ignore
    }
    try {
      const res = await fetch("/api/tracks/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId }),
      });
      const data = await res.json();
      if (res.ok && typeof data.playCount === "number") {
        setPlays(data.playCount);
      }
    } catch {
      // ignore network errors for analytics
    }
  }

  async function onDownload() {
    try {
      const res = await fetch("/api/tracks/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId }),
      });
      const data = await res.json();
      if (res.ok && typeof data.downloadCount === "number") {
        setDownloads(data.downloadCount);
      }
    } catch {
      // still allow download
    }

    const link = document.createElement("a");
    link.href = audioUrl;
    link.download = `${title.replace(/[^\w\-]+/g, "_") || "son"}.mp3`;
    link.target = "_blank";
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function toggleLike() {
    if (!fanLoggedIn) {
      setLikeHint("Connecte-toi en fan juste en bas pour liker.");
      return;
    }
    setBusyLike(true);
    setLikeHint(null);
    try {
      const res = await fetch("/api/tracks/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLikeHint(data.error ?? "Like impossible");
        setBusyLike(false);
        return;
      }
      setLiked(Boolean(data.liked));
      if (typeof data.likeCount === "number") setLikes(data.likeCount);
      setBusyLike(false);
      router.refresh();
    } catch {
      setLikeHint("Connexion impossible. Réessaie.");
      setBusyLike(false);
    }
  }

  return (
    <div className="track-listen">
      <header className="track-card-head">
        <p className="muted">{phaseLabel}</p>
        <h3>{title}</h3>
      </header>

      <div className="track-stats-row">
        <span className="track-stat">
          <strong>{formatVotes(plays)}</strong> écoutes
        </span>
        <span className="track-stat">
          <strong>{formatVotes(downloads)}</strong> téléchargements
        </span>
        <span className="track-stat">
          <strong>{formatVotes(likes)}</strong> likes
        </span>
      </div>

      <div className={hasLyrics ? "track-listen-grid" : "track-listen-solo"}>
        <div className="track-listen-player">
          <p className="track-listen-kicker">Écoute</p>
          <audio
            ref={audioRef}
            controls
            preload="none"
            src={audioUrl}
            className="phase-audio-player track-listen-audio"
            onPlay={registerPlay}
          >
            Lecteur audio
          </audio>

          <div className="track-listen-actions">
            <button
              type="button"
              className={liked ? "btn-ghost track-like is-liked" : "btn-ghost track-like"}
              onClick={toggleLike}
              disabled={busyLike}
            >
              {liked ? "Aimé" : "Liker"}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={onDownload}
            >
              Télécharger
            </button>
          </div>

          {likeHint ? <p className="muted track-listen-tip">{likeHint}</p> : null}

          {hasLyrics ? (
            <p className="muted track-listen-tip">
              Lance le son, puis scroll les lyrics à droite.
            </p>
          ) : (
            <p className="muted track-listen-tip">
              Pas encore de lyrics pour ce son.
            </p>
          )}
        </div>

        {hasLyrics ? (
          <div className="track-lyrics-panel">
            <div className="track-lyrics-head">
              <p className="track-listen-kicker">Lyrics</p>
            </div>
            <div className="track-lyrics-scroll" tabIndex={0}>
              <pre className="track-lyrics-text">{lyrics}</pre>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
