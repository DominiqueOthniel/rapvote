"use client";

import { useState } from "react";
import { formatVotes } from "@/lib/money";
import { HeartLikeButton } from "@/components/HeartLikeButton";
import {
  useFanPlayerOptional,
  type FanPlayerTrack,
} from "@/components/FanPlayerProvider";
import { SyncedLyrics } from "@/components/SyncedLyrics";
import { TrackLockOverlay } from "@/components/TrackLockOverlay";
import { LATE_SUBMISSION_PENALTY } from "@/lib/scoring";

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
  listenUnlockAt?: string | null;
  listenLockedMessage?: string | null;
  lateSubmission?: boolean;
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
  listenUnlockAt = null,
  listenLockedMessage = null,
  lateSubmission = false,
}: Props) {
  const player = useFanPlayerOptional();
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
  const livePlays = player?.playCounts[trackId];
  const shownPlays = typeof livePlays === "number" ? livePlays : initialPlays;
  const locked =
    Boolean(listenUnlockAt) &&
    Date.now() < new Date(listenUnlockAt as string).getTime();

  function onPlayClick() {
    if (!player) return;
    if (locked) {
      setLikeHint(listenLockedMessage ?? "Ce son est encore sous cadenas.");
      return;
    }
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
      listenUnlockAt,
      listenLockedMessage,
    };
    if (isActive) {
      player.toggle();
      return;
    }
    player.playTrack(next);
  }

  async function onDownload() {
    if (busyDownload) return;
    if (locked) {
      setLikeHint(listenLockedMessage ?? "Ce son est encore sous cadenas.");
      return;
    }
    if (!audioUrl) {
      setLikeHint("Audio indisponible pour le moment.");
      return;
    }
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
          <strong>{formatVotes(shownPlays)}</strong> écoutes
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
          {locked && listenUnlockAt ? (
            <TrackLockOverlay
              unlockAt={listenUnlockAt}
              message={listenLockedMessage}
            />
          ) : null}
          {lateSubmission ? (
            <p className="track-late-flag">
              Retard · -{LATE_SUBMISSION_PENALTY} sur la note de phase
            </p>
          ) : null}
          {player ? (
            <button
              type="button"
              className={`btn-primary track-listen-play-btn${
                isPlaying ? " is-playing" : ""
              }`}
              onClick={onPlayClick}
              disabled={locked}
            >
              {locked
                ? "Cadenas"
                : isPlaying
                  ? "Pause"
                  : isActive
                    ? "Reprendre"
                    : "Écouter"}
            </button>
          ) : locked ? null : (
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
            <SyncedLyrics
              lyrics={lyrics!}
              currentTime={isActive && player ? player.currentTime : 0}
              duration={isActive && player ? player.duration : 0}
              isPlaying={isPlaying}
              onSeek={isActive && player ? player.seek : undefined}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
