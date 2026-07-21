"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useFanPlayer } from "@/components/FanPlayerProvider";

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

  if (!track) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fan-now-playing" role="region" aria-label="Lecteur">
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

        <div className="fan-now-controls">
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
