"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

type LyricLine = {
  text: string;
  start: number;
  end: number;
};

const LRC_LINE = /^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)$/;

function isSectionBreak(text: string) {
  const t = text.trim().toLowerCase();
  if (!t) return true;
  return (
    /^(couplet|refrain|hook|outro|intro|pont|bridge|chorus|verse)\b/.test(t) ||
    /^\[.+\]$/.test(t) ||
    /^\(.+\)$/.test(t)
  );
}

/** Poids d'une ligne: plus de mots / syllabes ≈ plus de temps de flow. */
function lineWeight(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0.45;
  if (isSectionBreak(trimmed) && trimmed.length < 28) return 0.55;

  const words = trimmed.split(/\s+/).filter(Boolean);
  const letters = trimmed.replace(/[^a-zA-ZÀ-ÿ0-9']/g, "").length;
  // Approx syllabes: groupes de voyelles.
  const syllables = Math.max(
    1,
    (trimmed.match(/[aeiouyàâäéèêëïîôùûü]+/gi) ?? []).length,
  );

  const byWords = words.length * 0.48;
  const bySyllables = syllables * 0.28;
  const byLetters = letters * 0.028;
  // Hooks courts un peu plus longs, punchlines longues un peu compressées.
  const raw = byWords * 0.45 + bySyllables * 0.4 + byLetters * 0.15;
  return Math.min(4.2, Math.max(0.7, raw));
}

function parseLyrics(raw: string, duration: number): LyricLine[] {
  const rows = raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd());

  const timed: { text: string; start: number }[] = [];
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
    const sorted = timed.sort((a, b) => a.start - b.start);
    return sorted.map((line, i) => ({
      text: line.text,
      start: line.start,
      end:
        i < sorted.length - 1
          ? sorted[i + 1].start
          : Math.max(line.start + 2, duration || line.start + 2),
    }));
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
    return plain.map((text) => ({ text: text || " ", start: 0, end: 0 }));
  }

  // Intro / outro plus réalistes pour du rap (beat avant le flow).
  const intro = Math.min(
    Math.max(safeDuration * 0.11, 5),
    Math.min(22, safeDuration * 0.22),
  );
  const outro = Math.min(
    Math.max(safeDuration * 0.06, 3),
    Math.min(14, safeDuration * 0.12),
  );
  const usable = Math.max(safeDuration - intro - outro, safeDuration * 0.62);

  const weights = plain.map((text) => lineWeight(text));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0) || 1;

  let cursor = intro;
  const lines: LyricLine[] = plain.map((text, index) => {
    const span = (weights[index] / totalWeight) * usable;
    const start = cursor;
    const end = cursor + span;
    cursor = end;
    return { text: text || " ", start, end };
  });

  // Recale pour que la dernière ligne finisse pile avant l'outro.
  const last = lines[lines.length - 1];
  if (last) {
    const targetEnd = safeDuration - outro;
    if (last.end < targetEnd - 0.5) {
      last.end = targetEnd;
    }
  }

  return lines;
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
  const clockRef = useRef({ t: currentTime, wall: 0 });
  const [follow, setFollow] = useState(true);
  const [smoothTime, setSmoothTime] = useState(currentTime);

  const lines = useMemo(
    () => parseLyrics(lyrics, duration),
    [lyrics, duration],
  );

  useEffect(() => {
    clockRef.current = { t: currentTime, wall: performance.now() };
    if (!isPlaying) setSmoothTime(currentTime);
  }, [currentTime, isPlaying]);

  // Horloge fluide entre les timeupdate du <audio> (~4 Hz).
  useEffect(() => {
    if (!isPlaying) return;
    let raf = 0;
    const tick = () => {
      const { t, wall } = clockRef.current;
      const next = t + (performance.now() - wall) / 1000;
      setSmoothTime(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying]);

  const time = isPlaying ? smoothTime : currentTime;
  const current = activeIndex(lines, time);
  const currentLine = current >= 0 ? lines[current] : null;
  const lineProgress =
    currentLine && currentLine.end > currentLine.start
      ? Math.min(
          1,
          Math.max(
            0,
            (time - currentLine.start) /
              (currentLine.end - currentLine.start),
          ),
        )
      : 0;

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
              style={
                index === current
                  ? ({
                      "--line-progress": String(lineProgress),
                    } as CSSProperties)
                  : undefined
              }
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
