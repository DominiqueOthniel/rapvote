/** Constantes et helpers purs pour les notes jury (safe client). */

export const EXPECTED_JURY_COUNT = 3;
export const JURY_SCORE_MAX = 100;

/** Normalise une note stockée vers /100 (compat anciennes notes /10). */
export function asJuryScoreOutOf100(stored: number): number {
  if (stored <= 10) return Math.round(stored * 10);
  return Math.min(JURY_SCORE_MAX, Math.max(0, stored));
}

export function averageJuryScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  const normalized = scores.map(asJuryScoreOutOf100);
  const sum = normalized.reduce((total, score) => total + score, 0);
  return Math.round((sum / normalized.length) * 10) / 10;
}

export function formatScore(value: number): string {
  return value.toFixed(1);
}

export function formatJuryNote(value: number): string {
  return `${formatScore(asJuryScoreOutOf100(value))}/100`;
}
