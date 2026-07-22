import { asJuryScoreOutOf100 } from "@/lib/jury-score";

export { formatJuryNote, formatScore } from "@/lib/jury-score";

/** Poids publics classiques (à partir de l'épisode 9). */
export const VOTE_WEIGHT = 0.15;
export const JURY_WEIGHT = 0.85;

/** Les votes publics n'entrent dans la note qu'à partir de cet épisode. */
export const PUBLIC_VOTES_FROM_PHASE = 9;

export type ScoredEntry = {
  votesCount: number;
  juryScore: number;
};

export function weightsForPhase(phaseNumber: number) {
  if (phaseNumber >= PUBLIC_VOTES_FROM_PHASE) {
    return { voteWeight: VOTE_WEIGHT, juryWeight: JURY_WEIGHT };
  }
  // Avant l'épisode 9 : note 100% jury (les votes restent ouverts mais n'influencent pas).
  return { voteWeight: 0, juryWeight: 1 };
}

export function publicVotesAffectScore(phaseNumber: number) {
  return phaseNumber >= PUBLIC_VOTES_FROM_PHASE;
}

export function voteSharePercent(votesCount: number, maxVotes: number): number {
  if (maxVotes <= 0 || votesCount <= 0) return 0;
  return (votesCount / maxVotes) * 100;
}

export function votePoints(
  votesCount: number,
  maxVotes: number,
  phaseNumber = PUBLIC_VOTES_FROM_PHASE,
): number {
  const { voteWeight } = weightsForPhase(phaseNumber);
  return voteSharePercent(votesCount, maxVotes) * voteWeight;
}

/** Note jury /100 → contribution au score final. */
export function juryPoints(
  juryScoreStored: number,
  phaseNumber = PUBLIC_VOTES_FROM_PHASE,
): number {
  const score = asJuryScoreOutOf100(juryScoreStored);
  const { juryWeight } = weightsForPhase(phaseNumber);
  return (score / 100) * 100 * juryWeight;
}

export function phaseFinalScore(
  entry: ScoredEntry,
  maxVotes: number,
  phaseNumber = PUBLIC_VOTES_FROM_PHASE,
): number {
  return (
    votePoints(entry.votesCount, maxVotes, phaseNumber) +
    juryPoints(entry.juryScore, phaseNumber)
  );
}

export function getMaxVotes(entries: ScoredEntry[]): number {
  return entries.reduce((max, entry) => Math.max(max, entry.votesCount), 0);
}

export function sortByFinalScore<T extends ScoredEntry>(
  entries: T[],
  phaseNumber = PUBLIC_VOTES_FROM_PHASE,
): T[] {
  const maxVotes = getMaxVotes(entries);

  return [...entries].sort((a, b) => {
    const diff =
      phaseFinalScore(b, maxVotes, phaseNumber) -
      phaseFinalScore(a, maxVotes, phaseNumber);
    if (diff !== 0) return diff;
    const juryDiff =
      asJuryScoreOutOf100(b.juryScore) - asJuryScoreOutOf100(a.juryScore);
    if (juryDiff !== 0) return juryDiff;
    return b.votesCount - a.votesCount;
  });
}
