import { prisma } from "@/lib/db";
import { sortByFinalScore } from "@/lib/scoring";

export async function getActiveSeason() {
  return prisma.season.findFirst({
    where: { isActive: true },
    include: {
      phases: { orderBy: { number: "asc" } },
      packages: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function getCurrentPhase(seasonId: string) {
  const active = await prisma.phase.findFirst({
    where: { seasonId, status: "active" },
  });
  if (active) return active;

  return prisma.phase.findFirst({
    where: { seasonId },
    orderBy: { number: "asc" },
  });
}

export async function getPhaseRanking(phaseId: string) {
  const phase = await prisma.phase.findUnique({ where: { id: phaseId } });
  const entries = await prisma.phaseEntry.findMany({
    where: { phaseId, status: "active" },
    include: { candidate: true },
  });

  return sortByFinalScore(entries, phase?.number ?? 0);
}

export async function getPhaseEntries(phaseId: string) {
  const phase = await prisma.phase.findUnique({ where: { id: phaseId } });
  const entries = await prisma.phaseEntry.findMany({
    where: { phaseId },
    include: { candidate: true },
  });

  const phaseNumber = phase?.number ?? 0;
  const active = sortByFinalScore(
    entries.filter((entry) => entry.status === "active"),
    phaseNumber,
  );
  const eliminated = entries
    .filter((entry) => entry.status !== "active")
    .sort((a, b) => b.votesCount - a.votesCount);

  return [...active, ...eliminated];
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function uniqueCandidateSlug(base: string, excludeId?: string) {
  let slug = slugify(base);
  if (!slug) slug = "artiste";

  let candidate = await prisma.candidate.findUnique({ where: { slug } });
  let i = 1;

  while (candidate && candidate.id !== excludeId) {
    slug = `${slugify(base) || "artiste"}-${i++}`;
    candidate = await prisma.candidate.findUnique({ where: { slug } });
  }

  return slug;
}

export { PHASE_THEMES, EPISODES, getEpisodeByNumber } from "@/lib/parcours";
