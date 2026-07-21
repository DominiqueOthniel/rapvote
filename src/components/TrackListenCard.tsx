"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatVotes } from "@/lib/money";
import { HeartLikeButton } from "@/components/HeartLikeButton";
import {
  useFanPlayerOptional,
  type FanPlayerTrack,
} from "@/components/FanPlayerProvider";
import { SyncedLyrics } from "@/components/SyncedLyrics";

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
  candidateSlug: string;
  candidateName: string;
  candidatePhotoUrl: string | null;
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
  candidateSlug,
  candidateName,
  candidatePhotoUrl,
}: Props) {
  const router = useRouter();
  const player = useFanPlayerOptional();
  const [plays] = useState(initialPlays);
  const [downloads, setDownloads] = useState(initialDownloads);
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(likedByFan);
  const [busyLike, setBusyLike] = useState(false);
  const [busyDownload, setBusyDownload] = useState(false);
  const [likeHint, setLikeHint] = useState<string | null>(null);

  const hasLyrics = Boolean(lyrics?.trim());
  const displayTitle = title.trim() || `Son · ${candidateName}`;
  const isActive = player?.track?.id === trackId;
  const isPlaying = Boolean(isActive && player?.isPlaying);

  function onPlayClick() {
    if (!player) return;
    const next: FanPlayerTrack = {
      id: trackId,
      title: displayTitle,
      audioUrl,
      candidateSlug,
      candidateName,
      candidatePhotoUrl,
      likeCount: likes,
      likedByFan: liked,
      lyrics,
    };
    if (isActive) {
      player.toggle();
      return;
    }
    player.playTrack(next);
  }

  async function onDownload() {
    if (busyDownload) return;
    setBusyDownload(true);
    setLikeHint(null);

    try {
      const fileRes = await fetch(audioUrl, { mode: "cors" });
      if (fileRes.ok) {
        const blob = await fileRes.blob();
        const objectUrl = URL.createObjectURL(blob);
        const filename =
          `${displayTitle
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

      const link = document.createElement("a");
      link.href = `/api/tracks/download?trackId=${encodeURIComponent(trackId)}`;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setDownloads((n) => n + 1);
    } catch {
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
      setLikeHint("Connecte-toi pour liker.");
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
        <h3>{displayTitle}</h3>
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
          {player ? (
            <button
              type="button"
              className={`btn-primary track-listen-play-btn${
                isPlaying ? " is-playing" : ""
              }`}
              onClick={onPlayClick}
            >
              {isPlaying ? "Pause" : isActive ? "Reprendre" : "Écouter"}
            </button>
          ) : (
            <audio
              controls
              preload="none"
              src={audioUrl}
              className="phase-audio-player track-listen-audio"
            >
              Lecteur audio
            </audio>
          )}

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
        </div>

        {hasLyrics ? (
          <div className="track-lyrics-panel">
            <div className="track-lyrics-head">
              <p className="track-listen-kicker">Lyrics</p>
            </div>
            {isActive && player ? (
              <SyncedLyrics
                lyrics={lyrics!}
                currentTime={player.currentTime}
                duration={player.duration}
                isPlaying={isPlaying}
                onSeek={player.seek}
              />
            ) : (
              <div className="track-lyrics-scroll" tabIndex={0}>
                <pre className="track-lyrics-text">{lyrics}</pre>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
