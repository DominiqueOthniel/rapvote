"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

type LyricLine = {
  text: string;
  start: number;
  end: number;
};

const LRC_LINE = /^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)$/;

function parseTimedLyrics(raw: string, duration: number): LyricLine[] | null {
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

  if (timed.length < 2) return null;

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

function parsePlainLyrics(raw: string): string[] {
  return raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(LRC_LINE, "$4").trimEnd())
    .filter((line, i, arr) => {
      if (line.trim().length > 0) return true;
      const prev = arr[i - 1]?.trim();
      const next = arr[i + 1]?.trim();
      return Boolean(prev || next);
    });
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

  const timedLines = useMemo(
    () => parseTimedLyrics(lyrics, duration),
    [lyrics, duration],
  );
  const plainLines = useMemo(
    () => (timedLines ? [] : parsePlainLyrics(lyrics)),
    [lyrics, timedLines],
  );

  useEffect(() => {
    clockRef.current = { t: currentTime, wall: performance.now() };
    if (!isPlaying) setSmoothTime(currentTime);
  }, [currentTime, isPlaying]);

  useEffect(() => {
    if (!isPlaying || !timedLines) return;
    let raf = 0;
    const tick = () => {
      const { t, wall } = clockRef.current;
      const next = t + (performance.now() - wall) / 1000;
      setSmoothTime(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, timedLines]);

  const time = isPlaying ? smoothTime : currentTime;
  const current = timedLines ? activeIndex(timedLines, time) : -1;
  const currentLine =
    timedLines && current >= 0 ? timedLines[current] : null;
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
    if (!timedLines || !follow || current < 0) return;
    const node = lineRefs.current[current];
    const scroller = scrollerRef.current;
    if (!node || !scroller) return;

    const target =
      node.offsetTop - scroller.clientHeight / 2 + node.clientHeight / 2;
    scroller.scrollTo({
      top: Math.max(0, target),
      behavior: isPlaying ? "smooth" : "auto",
    });
  }, [current, follow, isPlaying, timedLines]);

  function onUserScroll() {
    if (!timedLines || !follow) return;
    userPausedFollow.current = true;
    setFollow(false);
    if (pauseTimer.current) window.clearTimeout(pauseTimer.current);
    pauseTimer.current = window.setTimeout(() => {
      userPausedFollow.current = false;
      setFollow(true);
    }, 4000);
  }

  if (timedLines && timedLines.length > 0) {
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
          {timedLines.map((line, index) => {
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

  if (plainLines.length === 0) {
    return <p className="muted">Pas de lyrics.</p>;
  }

  return (
    <div className="synced-lyrics synced-lyrics-plain">
      <p className="muted synced-lyrics-plain-note">
        Paroles non synchronisées
      </p>
      <div className="synced-lyrics-scroll" tabIndex={0}>
        {plainLines.map((line, index) => (
          <p key={`plain-${index}`} className="synced-lyrics-line is-plain">
            {line.trim() ? line : " "}
          </p>
        ))}
      </div>
    </div>
  );
}
