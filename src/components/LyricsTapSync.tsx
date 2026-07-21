"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const LRC_LINE = /^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)$/;

function stripToPlainLines(raw: string) {
  return raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => {
      const match = line.match(LRC_LINE);
      return match ? (match[4] ?? "").trimEnd() : line.trimEnd();
    })
    .filter((line, i, arr) => {
      if (line.trim().length > 0) return true;
      const prev = arr[i - 1]?.trim();
      const next = arr[i + 1]?.trim();
      return Boolean(prev || next);
    });
}

function formatLrcTime(seconds: number) {
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  const cs = Math.floor((safe % 1) * 100);
  return `[${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}]`;
}

function buildLrc(stamps: { text: string; start: number }[]) {
  return stamps
    .map((row) => `${formatLrcTime(row.start)} ${row.text}`.trimEnd())
    .join("\n");
}

function countTimedLines(raw: string) {
  return raw
    .split("\n")
    .filter((line) => LRC_LINE.test(line.trim())).length;
}

type Props = {
  phaseId: string;
  audioUrl: string;
  lyrics: string;
  onLyricsSaved: (lyrics: string) => void;
};

export function LyricsTapSync({
  phaseId,
  audioUrl,
  lyrics,
  onLyricsSaved,
}: Props) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [stamps, setStamps] = useState<{ text: string; start: number }[]>([]);
  const [cursor, setCursor] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const timedCount = countTimedLines(lyrics);
  const done = cursor >= lines.length && lines.length > 0;
  const currentLine = lines[cursor] ?? null;

  const startSession = useCallback(() => {
    const plain = stripToPlainLines(lyrics);
    if (plain.length === 0) {
      setError("Colle d'abord tes lyrics dans le champ ci-dessus.");
      return;
    }
    setError(null);
    setHint(null);
    setLines(plain);
    setStamps([]);
    setCursor(0);
    setOpen(true);
    requestAnimationFrame(() => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = 0;
      void audio.play().catch(() => undefined);
    });
  }, [lyrics]);

  const markCurrent = useCallback(() => {
    if (done || currentLine === null) return;
    const audio = audioRef.current;
    const t = audio?.currentTime ?? 0;
    setStamps((prev) => [...prev, { text: currentLine, start: t }]);
    setCursor((c) => c + 1);
    setHint(null);
  }, [currentLine, done]);

  const undo = useCallback(() => {
    setStamps((prev) => {
      if (prev.length === 0) return prev;
      setCursor((c) => Math.max(0, c - 1));
      return prev.slice(0, -1);
    });
  }, []);

  async function saveSync() {
    if (stamps.length === 0) {
      setError("Marque au moins une ligne.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const timed = buildLrc(stamps);
      const res = await fetch("/api/tracks/lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phaseId,
          lyrics: timed,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Enregistrement impossible");
      onLyricsSaved(timed);
      setHint("Sync enregistrée");
      setOpen(false);
      audioRef.current?.pause();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        markCurrent();
      }
      if (e.key === "Backspace" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        undo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, markCurrent, undo]);

  const progressLabel = useMemo(() => {
    if (lines.length === 0) return "";
    return `${Math.min(cursor, lines.length)} / ${lines.length}`;
  }, [cursor, lines.length]);

  return (
    <div className="lyrics-tap-sync">
      <div className="lyrics-tap-sync-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={startSession}
          disabled={!lyrics.trim()}
        >
          Synchroniser au tap
        </button>
        {timedCount >= 2 ? (
          <span className="muted lyrics-tap-sync-status">
            Sync active · {timedCount} lignes
          </span>
        ) : (
          <span className="muted lyrics-tap-sync-status">
            Pas encore synchronisé
          </span>
        )}
      </div>

      {open ? (
        <div className="lyrics-tap-panel">
          <div className="lyrics-tap-panel-head">
            <strong>Tap sync</strong>
            <span className="muted">{progressLabel}</span>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setOpen(false);
                audioRef.current?.pause();
              }}
            >
              Fermer
            </button>
          </div>

          <audio
            ref={audioRef}
            controls
            src={audioUrl}
            className="phase-audio-player lyrics-tap-audio"
            preload="metadata"
          >
            Lecteur audio
          </audio>

          <p className="muted lyrics-tap-help">
            Lance le son, puis tape Espace / Entrée (ou le bouton) à chaque
            début de ligne.
          </p>

          <div className="lyrics-tap-current">
            {done ? (
              <p className="lyrics-tap-done">Toutes les lignes sont marquées.</p>
            ) : (
              <>
                <span className="muted">Ligne suivante</span>
                <p className="lyrics-tap-line">
                  {currentLine?.trim() ? currentLine : "·"}
                </p>
              </>
            )}
          </div>

          <div className="lyrics-tap-controls">
            <button
              type="button"
              className="btn-primary"
              onClick={markCurrent}
              disabled={done}
            >
              Marquer
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={undo}
              disabled={stamps.length === 0}
            >
              Annuler
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setStamps([]);
                setCursor(0);
                const audio = audioRef.current;
                if (audio) {
                  audio.currentTime = 0;
                  void audio.play().catch(() => undefined);
                }
              }}
            >
              Recommencer
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void saveSync()}
              disabled={saving || stamps.length === 0}
            >
              {saving ? "Enregistrement..." : "Enregistrer la sync"}
            </button>
          </div>

          {stamps.length > 0 ? (
            <ol className="lyrics-tap-stamped">
              {stamps.map((row, i) => (
                <li key={`${row.start}-${i}`}>
                  <code>{formatLrcTime(row.start)}</code>
                  <span>{row.text.trim() || "·"}</span>
                </li>
              ))}
            </ol>
          ) : null}

          {error ? <p className="error">{error}</p> : null}
          {hint && !error ? <p className="muted">{hint}</p> : null}
        </div>
      ) : null}

      {error && !open ? <p className="error">{error}</p> : null}
    </div>
  );
}
