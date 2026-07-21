"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type LyricLine = {
  text: string;
  start: number;
};

const LRC_LINE =
  /^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)$/;

function parseLyrics(raw: string, duration: number): LyricLine[] {
  const rows = raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd());

  const timed: LyricLine[] = [];
  for (const row of rows) {
    const match = row.match(LRC_LINE);
    if (!match) continue;
    const minutes = Number(match[1]);
    const seconds = Number(match[2]);
    const frac = match[3] ? Number(`0.${match[3]}`) : 0;
    const start = minutes * 60 + seconds + frac;
    const text = (match[4] ?? "").trim();
    timed.push({ start, text: text || " " });
  }

  if (timed.length >= 2) {
    return timed.sort((a, b) => a.start - b.start);
  }

  const plain = rows
    .map((line) => line.replace(LRC_LINE, "$4").trimEnd())
    .filter((line, i, arr) => {
      if (line.trim().length > 0) return true;
      const prev = arr[i - 1]?.trim();
      const next = arr[i + 1]?.trim();
      return Boolean(prev || next);
    });

  if (plain.length === 0) return [];

  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  if (safeDuration <= 0) {
    return plain.map((text) => ({ text: text || " ", start: 0 }));
  }

  // Estimation Spotify-like: intro courte, puis lignes réparties, outro courte.
  const intro = Math.min(4, safeDuration * 0.06);
  const outro = Math.min(6, safeDuration * 0.08);
  const usable = Math.max(safeDuration - intro - outro, safeDuration * 0.7);
  const step = usable / Math.max(plain.length, 1);

  return plain.map((text, index) => ({
    text: text || " ",
    start: intro + index * step,
  }));
}

function activeIndex(lines: LyricLine[], currentTime: number) {
  if (lines.length === 0) return -1;
  let idx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].start <= currentTime) idx = i;
    else break;
  }
  return idx;
}

type Props = {
  lyrics: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek?: (time: number) => void;
};

export function SyncedLyrics({
  lyrics,
  currentTime,
  duration,
  isPlaying,
  onSeek,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const lineRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const userPausedFollow = useRef(false);
  const pauseTimer = useRef<number | null>(null);
  const [follow, setFollow] = useState(true);

  const lines = useMemo(
    () => parseLyrics(lyrics, duration),
    [lyrics, duration],
  );
  const current = activeIndex(lines, currentTime);

  useEffect(() => {
    if (!follow || current < 0) return;
    const node = lineRefs.current[current];
    const scroller = scrollerRef.current;
    if (!node || !scroller) return;

    const target =
      node.offsetTop - scroller.clientHeight / 2 + node.clientHeight / 2;
    scroller.scrollTo({
      top: Math.max(0, target),
      behavior: isPlaying ? "smooth" : "auto",
    });
  }, [current, follow, isPlaying]);

  function onUserScroll() {
    if (!follow) return;
    userPausedFollow.current = true;
    setFollow(false);
    if (pauseTimer.current) window.clearTimeout(pauseTimer.current);
    pauseTimer.current = window.setTimeout(() => {
      userPausedFollow.current = false;
      setFollow(true);
    }, 4000);
  }

  if (lines.length === 0) {
    return <p className="muted">Pas de lyrics.</p>;
  }

  return (
    <div className="synced-lyrics">
      <div
        ref={scrollerRef}
        className="synced-lyrics-scroll"
        tabIndex={0}
        onScroll={onUserScroll}
        onWheel={onUserScroll}
        onTouchMove={onUserScroll}
      >
        <div className="synced-lyrics-spacer" aria-hidden="true" />
        {lines.map((line, index) => {
          const state =
            index === current
              ? "is-current"
              : index < current
                ? "is-past"
                : "is-next";
          return (
            <button
              key={`${line.start}-${index}`}
              type="button"
              ref={(el) => {
                lineRefs.current[index] = el;
              }}
              className={`synced-lyrics-line ${state}`}
              onClick={() => onSeek?.(line.start)}
            >
              {line.text.trim() ? line.text : " "}
            </button>
          );
        })}
        <div className="synced-lyrics-spacer" aria-hidden="true" />
      </div>
      {!follow ? (
        <button
          type="button"
          className="synced-lyrics-follow"
          onClick={() => {
            setFollow(true);
            userPausedFollow.current = false;
          }}
        >
          Suivre
        </button>
      ) : null}
    </div>
  );
}
