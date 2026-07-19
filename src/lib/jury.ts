import { prisma } from "@/lib/db";
import {
  clampCriterion,
  computeRubricTotal,
  getRubricForPhase,
  parseBreakdown,
  type RubricDef,
} from "@/lib/judging";

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

export async function syncPhaseEntryJuryAverage(phaseEntryId: string) {
  const scores = await prisma.juryScore.findMany({
    where: { phaseEntryId },
    select: { score: true },
  });

  const average = averageJuryScore(scores.map((item) => item.score));
  const juryScore = Math.round(average);

  await prisma.phaseEntry.update({
    where: { id: phaseEntryId },
    data: { juryScore },
  });

  return average;
}

export function buildBreakdownFromForm(
  rubric: RubricDef,
  formData: FormData,
): Record<string, number> {
  const breakdown: Record<string, number> = {};
  for (const criterion of rubric.criteria) {
    const raw = Number(formData.get(`c_${criterion.key}`));
    breakdown[criterion.key] = clampCriterion(raw, criterion.max);
  }
  return breakdown;
}

export async function upsertJuryRubricScore(params: {
  juryId: string;
  phaseEntryId: string;
  phaseNumber: number;
  formData: FormData;
}) {
  const rubric = getRubricForPhase(params.phaseNumber);
  const breakdown = buildBreakdownFromForm(rubric, params.formData);
  const score = computeRubricTotal(rubric, breakdown);

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
      breakdown,
    },
    update: { score, breakdown },
  });

  return syncPhaseEntryJuryAverage(params.phaseEntryId);
}

export { parseBreakdown, getRubricForPhase };
