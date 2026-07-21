/** Prix unitaire de base (1 vote). */
export const BASE_VOTE_PRICE_XAF = 100;

/** Plafond pour un vote libre. */
export const MAX_CUSTOM_VOTES = 1000;

export const DEFAULT_VOTE_PACKS = [
  { votesCount: 1, sortOrder: 1 },
  { votesCount: 2, sortOrder: 2 },
  { votesCount: 3, sortOrder: 3 },
  { votesCount: 5, sortOrder: 4 },
  { votesCount: 10, sortOrder: 5 },
  { votesCount: 20, sortOrder: 6 },
  { votesCount: 25, sortOrder: 7 },
  { votesCount: 50, sortOrder: 8 },
  { votesCount: 100, sortOrder: 9 },
  { votesCount: 200, sortOrder: 10 },
  { votesCount: 500, sortOrder: 11 },
] as const;

/**
 * Tarification dégressive par volume.
 * Alignée sur l'esprit des packs historiques (1=100, 5=90, 10=80, 50=70).
 */
export function priceForVotes(votes: number): number {
  const n = Math.floor(votes);
  if (n < 1) return 0;
  if (n >= 500) return n * 56;
  if (n >= 200) return n * 60;
  if (n >= 100) return n * 65;
  if (n >= 50) return n * 70;
  if (n >= 25) return n * 72;
  if (n >= 20) return n * 75;
  if (n >= 10) return n * 80;
  if (n >= 5) return n * 90;
  return n * BASE_VOTE_PRICE_XAF;
}

export function votePackLabel(votesCount: number) {
  return votesCount === 1 ? "1 vote" : `${votesCount} votes`;
}
