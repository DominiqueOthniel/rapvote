import { asJuryScoreOutOf10 } from "@/lib/jury";

export const VOTE_WEIGHT = 0.15;
export const JURY_WEIGHT = 0.85;

export type ScoredEntry = {
  votesCount: number;
  juryScore: number;
};

export function voteSharePercent(votesCount: number, maxVotes: number): number {
  if (maxVotes <= 0 || votesCount <= 0) return 0;
  return (votesCount / maxVotes) * 100;
}

export function votePoints(votesCount: number, maxVotes: number): number {
  return voteSharePercent(votesCount, maxVotes) * VOTE_WEIGHT;
}

/** Note jury /10 → contribution au score final (max 85 pts). */
export function juryPoints(juryScoreOutOf10: number): number {
  const score = asJuryScoreOutOf10(juryScoreOutOf10);
  return (score / 10) * 100 * JURY_WEIGHT;
}

export function phaseFinalScore(entry: ScoredEntry, maxVotes: number): number {
  return votePoints(entry.votesCount, maxVotes) + juryPoints(entry.juryScore);
}

export function getMaxVotes(entries: ScoredEntry[]): number {
  return entries.reduce((max, entry) => Math.max(max, entry.votesCount), 0);
}

export function sortByFinalScore<T extends ScoredEntry>(entries: T[]): T[] {
  const maxVotes = getMaxVotes(entries);

  return [...entries].sort((a, b) => {
    const diff = phaseFinalScore(b, maxVotes) - phaseFinalScore(a, maxVotes);
    if (diff !== 0) return diff;
    const juryDiff =
      asJuryScoreOutOf10(b.juryScore) - asJuryScoreOutOf10(a.juryScore);
    if (juryDiff !== 0) return juryDiff;
    return b.votesCount - a.votesCount;
  });
}

export function formatScore(value: number): string {
  return value.toFixed(1);
}

export function formatJuryNote(value: number): string {
  return `${formatScore(asJuryScoreOutOf10(value))}/10`;
}
