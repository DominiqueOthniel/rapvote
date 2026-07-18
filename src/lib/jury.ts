import { prisma } from "@/lib/db";

export const EXPECTED_JURY_COUNT = 3;
export const JURY_SCORE_MAX = 10;

export function clampJuryScore(value: number): number {
  return Math.min(JURY_SCORE_MAX, Math.max(0, Math.round(value)));
}

export function averageJuryScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((total, score) => total + score, 0);
  return Math.round((sum / scores.length) * 10) / 10;
}

/** Compat: anciennes notes /100 → /10. */
export function asJuryScoreOutOf10(stored: number): number {
  if (stored > JURY_SCORE_MAX) {
    return clampJuryScore(stored / 10);
  }
  return stored;
}

export async function syncPhaseEntryJuryAverage(phaseEntryId: string) {
  const scores = await prisma.juryScore.findMany({
    where: { phaseEntryId },
    select: { score: true },
  });

  const average = averageJuryScore(
    scores.map((item) => asJuryScoreOutOf10(item.score)),
  );
  const juryScore = Math.round(average);

  await prisma.phaseEntry.update({
    where: { id: phaseEntryId },
    data: { juryScore },
  });

  return average;
}

export async function upsertJuryScore(params: {
  juryId: string;
  phaseEntryId: string;
  score: number;
}) {
  const score = clampJuryScore(params.score);

  await prisma.juryScore.upsert({
    where: {
      juryId_phaseEntryId: {
        juryId: params.juryId,
        phaseEntryId: params.phaseEntryId,
      },
    },
    create: {
      juryId: params.juryId,
      phaseEntryId: params.phaseEntryId,
      score,
    },
    update: { score },
  });

  return syncPhaseEntryJuryAverage(params.phaseEntryId);
}
