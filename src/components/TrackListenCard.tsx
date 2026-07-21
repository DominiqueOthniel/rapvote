"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatVotes } from "@/lib/money";
import { HeartLikeButton } from "@/components/HeartLikeButton";

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
  const listenedSeconds = useRef(0);
  const lastCurrentTime = useRef(0);
  const [plays, setPlays] = useState(initialPlays);
  const [downloads, setDownloads] = useState(initialDownloads);
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(likedByFan);
  const [busyLike, setBusyLike] = useState(false);
  const [busyDownload, setBusyDownload] = useState(false);
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

  function onAudioTimeUpdate() {
    if (countedPlay.current) return;
    const audio = audioRef.current;
    if (!audio) return;

    const duration = audio.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;

    const current = audio.currentTime;
    const delta = current - lastCurrentTime.current;
    // Compte seulement le temps réellement écouté (ignore les sauts de seek).
    if (delta > 0 && delta < 1.5) {
      listenedSeconds.current += delta;
    }
    lastCurrentTime.current = current;

    if (listenedSeconds.current >= duration * 0.5) {
      void registerPlay();
    }
  }

  function onAudioSeeked() {
    const audio = audioRef.current;
    if (!audio) return;
    lastCurrentTime.current = audio.currentTime;
  }

  async function onDownload() {
    if (busyDownload) return;
    setBusyDownload(true);
    setLikeHint(null);

    try {
      // 1) Tente un vrai fichier côté navigateur (blob) pour forcer le download.
      const fileRes = await fetch(audioUrl, { mode: "cors" });
      if (fileRes.ok) {
        const blob = await fileRes.blob();
        const objectUrl = URL.createObjectURL(blob);
        const filename =
          `${title
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^\w\s.-]+/g, "")
            .trim()
            .replace(/\s+/g, "_")
            .slice(0, 80) || "son"}.mp3`;

        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(objectUrl);

        // Compte après succès réel.
        const countRes = await fetch(
          `/api/tracks/download?trackId=${encodeURIComponent(trackId)}&countOnly=1`,
        );
        if (countRes.ok) {
          const data = await countRes.json().catch(() => null);
          if (typeof data?.downloadCount === "number") {
            setDownloads(data.downloadCount);
          } else {
            setDownloads((n) => n + 1);
          }
        } else {
          setDownloads((n) => n + 1);
        }
        return;
      }

      // 2) Fallback serveur (signed URL / proxy).
      const link = document.createElement("a");
      link.href = `/api/tracks/download?trackId=${encodeURIComponent(trackId)}`;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setDownloads((n) => n + 1);
    } catch {
      // Dernier recours: endpoint serveur.
      try {
        window.location.href = `/api/tracks/download?trackId=${encodeURIComponent(trackId)}`;
        setDownloads((n) => n + 1);
      } catch {
        setLikeHint("Téléchargement impossible. Réessaie.");
      }
    } finally {
      setBusyDownload(false);
    }
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
            onTimeUpdate={onAudioTimeUpdate}
            onSeeked={onAudioSeeked}
          >
            Lecteur audio
          </audio>

          <div className="track-listen-actions">
            <HeartLikeButton
              liked={liked}
              busy={busyLike}
              count={likes}
              onToggle={toggleLike}
              labelLiked="Retirer le like"
              labelIdle="Liker ce son"
            />
            <button
              type="button"
              className="btn-ghost"
              onClick={onDownload}
              disabled={busyDownload}
            >
              {busyDownload ? "Téléchargement..." : "Télécharger"}
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
