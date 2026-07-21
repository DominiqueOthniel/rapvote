"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const LRC_LINE = /^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)$/;

function isSectionLabel(text: string) {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  return (
    /^(couplet|refrain|hook|outro|intro|pont|bridge|chorus|verse)\b/.test(t) ||
    /^\[.+\]$/.test(t)
  );
}

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

function stampsFromTempo(
  lines: string[],
  bpm: number,
  offsetSec: number,
  beatsPerLine: number,
) {
  const safeBpm = Math.min(220, Math.max(40, bpm));
  const safeBeats = Math.min(16, Math.max(1, beatsPerLine));
  const step = (60 / safeBpm) * safeBeats;
  let t = Math.max(0, offsetSec);
  const stamps: { text: string; start: number }[] = [];

  for (const line of lines) {
    stamps.push({ text: line, start: t });
    if (!line.trim()) {
      t += step * 0.5;
    } else if (isSectionLabel(line)) {
      t += step * 0.25;
    } else {
      t += step;
    }
  }

  return stamps;
}

type Mode = "tempo" | "tap";

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
  const [mode, setMode] = useState<Mode>("tempo");
  const [bpm, setBpm] = useState(90);
  const [offsetSec, setOffsetSec] = useState(8);
  const [beatsPerLine, setBeatsPerLine] = useState(4);
  const [lines, setLines] = useState<string[]>([]);
  const [tapStamps, setTapStamps] = useState<{ text: string; start: number }[]>(
    [],
  );
  const [cursor, setCursor] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const timedCount = countTimedLines(lyrics);
  const plainLines = useMemo(() => stripToPlainLines(lyrics), [lyrics]);

  const tempoStamps = useMemo(
    () => stampsFromTempo(plainLines, bpm, offsetSec, beatsPerLine),
    [plainLines, bpm, offsetSec, beatsPerLine],
  );

  const tapDone = cursor >= lines.length && lines.length > 0;
  const currentTapLine = lines[cursor] ?? null;
  const previewStamps = mode === "tempo" ? tempoStamps : tapStamps;

  const openPanel = useCallback(() => {
    if (plainLines.length === 0) {
      setError("Colle d'abord tes lyrics dans le champ ci-dessus.");
      return;
    }
    setError(null);
    setHint(null);
    setLines(plainLines);
    setTapStamps([]);
    setCursor(0);
    setMode("tempo");
    setOpen(true);
  }, [plainLines]);

  const markFirstLine = useCallback(() => {
    const audio = audioRef.current;
    const t = audio?.currentTime ?? 0;
    setOffsetSec(Math.round(t * 100) / 100);
    setHint(`Début calé à ${formatLrcTime(t)}`);
  }, []);

  const markCurrentTap = useCallback(() => {
    if (tapDone || currentTapLine === null) return;
    const audio = audioRef.current;
    const t = audio?.currentTime ?? 0;
    setTapStamps((prev) => [...prev, { text: currentTapLine, start: t }]);
    setCursor((c) => c + 1);
    setHint(null);
  }, [currentTapLine, tapDone]);

  const undoTap = useCallback(() => {
    setTapStamps((prev) => {
      if (prev.length === 0) return prev;
      setCursor((c) => Math.max(0, c - 1));
      return prev.slice(0, -1);
    });
  }, []);

  async function saveSync(stamps: { text: string; start: number }[]) {
    if (stamps.length === 0) {
      setError("Aucune ligne à enregistrer.");
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
    if (!open || mode !== "tap") return;
    function onKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        markCurrentTap();
      }
      if (e.key === "Backspace" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        undoTap();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, mode, markCurrentTap, undoTap]);

  const stepLabel = useMemo(() => {
    const sec = (60 / Math.max(40, bpm)) * beatsPerLine;
    return `${sec.toFixed(2)} s / ligne`;
  }, [bpm, beatsPerLine]);

  return (
    <div className="lyrics-tap-sync">
      <div className="lyrics-tap-sync-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={openPanel}
          disabled={!lyrics.trim()}
        >
          Caler les lyrics
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
            <strong>Sync lyrics</strong>
            <div className="lyrics-sync-modes">
              <button
                type="button"
                className={`btn-ghost${mode === "tempo" ? " is-active" : ""}`}
                onClick={() => setMode("tempo")}
              >
                Tempo
              </button>
              <button
                type="button"
                className={`btn-ghost${mode === "tap" ? " is-active" : ""}`}
                onClick={() => {
                  setMode("tap");
                  setLines(plainLines);
                  setTapStamps([]);
                  setCursor(0);
                }}
              >
                Tap ligne
              </button>
            </div>
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

          {mode === "tempo" ? (
            <>
              <p className="muted lyrics-tap-help">
                Indique le BPM du beat, le moment où le flow commence, et combien
                de temps chaque ligne dure (en beats). Puis enregistre.
              </p>

              <div className="lyrics-tempo-grid">
                <label className="field">
                  <span>BPM</span>
                  <input
                    type="number"
                    min={40}
                    max={220}
                    step={1}
                    value={bpm}
                    onChange={(e) => setBpm(Number(e.target.value) || 90)}
                  />
                </label>
                <label className="field">
                  <span>Beats / ligne</span>
                  <select
                    value={beatsPerLine}
                    onChange={(e) => setBeatsPerLine(Number(e.target.value))}
                  >
                    <option value={2}>2 (rap dense)</option>
                    <option value={4}>4 (1 mesure)</option>
                    <option value={8}>8 (2 mesures)</option>
                  </select>
                </label>
                <label className="field">
                  <span>Début du flow (s)</span>
                  <input
                    type="number"
                    min={0}
                    max={600}
                    step={0.05}
                    value={offsetSec}
                    onChange={(e) =>
                      setOffsetSec(Number(e.target.value) || 0)
                    }
                  />
                </label>
              </div>

              <p className="muted lyrics-tap-help">
                {plainLines.length} lignes · {stepLabel}
              </p>

              <div className="lyrics-tap-controls">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={markFirstLine}
                >
                  Marquer le début maintenant
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => void saveSync(tempoStamps)}
                  disabled={saving || tempoStamps.length === 0}
                >
                  {saving ? "Enregistrement..." : "Enregistrer au tempo"}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="muted lyrics-tap-help">
                Lance le son, puis tape Espace / Entrée à chaque début de ligne
                pour un calage précis.
              </p>

              <div className="lyrics-tap-current">
                {tapDone ? (
                  <p className="lyrics-tap-done">
                    Toutes les lignes sont marquées.
                  </p>
                ) : (
                  <>
                    <span className="muted">
                      Ligne {Math.min(cursor + 1, lines.length)} / {lines.length}
                    </span>
                    <p className="lyrics-tap-line">
                      {currentTapLine?.trim() ? currentTapLine : "·"}
                    </p>
                  </>
                )}
              </div>

              <div className="lyrics-tap-controls">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={markCurrentTap}
                  disabled={tapDone}
                >
                  Marquer
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={undoTap}
                  disabled={tapStamps.length === 0}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setTapStamps([]);
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
                  onClick={() => void saveSync(tapStamps)}
                  disabled={saving || tapStamps.length === 0}
                >
                  {saving ? "Enregistrement..." : "Enregistrer le tap"}
                </button>
              </div>
            </>
          )}

          {previewStamps.length > 0 ? (
            <ol className="lyrics-tap-stamped">
              {previewStamps.slice(0, 40).map((row, i) => (
                <li key={`${row.start}-${i}`}>
                  <code>{formatLrcTime(row.start)}</code>
                  <span>{row.text.trim() || "·"}</span>
                </li>
              ))}
              {previewStamps.length > 40 ? (
                <li>
                  <code>…</code>
                  <span className="muted">
                    +{previewStamps.length - 40} lignes
                  </span>
                </li>
              ) : null}
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
