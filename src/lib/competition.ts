import { prisma } from "@/lib/db";
import { sortByFinalScore } from "@/lib/scoring";
import { DEFAULT_VOTE_PACKS } from "@/lib/vote-packs";
import { ensureSeasonVotePackages } from "@/lib/ensure-vote-packages";

export function cumulativeVotes(entry: {
  votesCount: number;
  candidate: { totalVotes: number };
}) {
  return entry.candidate.totalVotes;
}

/** Aligne les entrées de phase sur le total cumulé candidat. */
export async function syncPhaseEntryVotes(phaseId: string) {
  const entries = await prisma.phaseEntry.findMany({
    where: { phaseId },
    select: { id: true, votesCount: true, candidate: { select: { totalVotes: true } } },
  });

  await Promise.all(
    entries
      .filter((entry) => entry.votesCount < entry.candidate.totalVotes)
      .map((entry) =>
        prisma.phaseEntry.update({
          where: { id: entry.id },
          data: { votesCount: entry.candidate.totalVotes },
        }),
      ),
  );
}

export async function getActiveSeason() {
  const season = await prisma.season.findFirst({
    where: { isActive: true },
    include: {
      phases: { orderBy: { number: "asc" } },
      packages: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  if (!season) return null;

  const wanted = DEFAULT_VOTE_PACKS.map((p) => p.votesCount);
  const activeCounts = season.packages.map((p) => p.votesCount).sort((a, b) => a - b);
  const wantedSorted = [...wanted].sort((a, b) => a - b);
  const sameLength = activeCounts.length === wantedSorted.length;
  const sameSet =
    sameLength &&
    activeCounts.every((count, i) => count === wantedSorted[i]);
  const hasDupes =
    new Set(activeCounts).size !== activeCounts.length;

  if (!sameSet || hasDupes) {
    const packages = await ensureSeasonVotePackages(season.id);
    return { ...season, packages };
  }

  return season;
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
  await syncPhaseEntryVotes(phaseId);

  const phase = await prisma.phase.findUnique({ where: { id: phaseId } });
  const entries = await prisma.phaseEntry.findMany({
    where: { phaseId, status: "active" },
    include: { candidate: true },
  });

  const scored = entries.map((entry) => ({
    ...entry,
    votesCount: cumulativeVotes(entry),
  }));

  return sortByFinalScore(scored, phase?.number ?? 0);
}

export async function getPhaseEntries(phaseId: string) {
  await syncPhaseEntryVotes(phaseId);

  const phase = await prisma.phase.findUnique({ where: { id: phaseId } });
  const entries = await prisma.phaseEntry.findMany({
    where: { phaseId },
    include: { candidate: true },
  });

  const phaseNumber = phase?.number ?? 0;
  const withVotes = entries.map((entry) => ({
    ...entry,
    votesCount: cumulativeVotes(entry),
  }));
  const active = sortByFinalScore(
    withVotes.filter((entry) => entry.status === "active"),
    phaseNumber,
  );
  const eliminated = withVotes
    .filter((entry) => entry.status !== "active")
    .sort((a, b) => b.votesCount - a.votesCount);

  return [...active, ...eliminated];
}

export async function getSeasonTracksFeed(
  seasonId: string,
  fanId?: string | null,
) {
  return prisma.phaseTrack.findMany({
    where: {
      phase: { seasonId },
    },
    include: {
      candidate: {
        select: {
          id: true,
          slug: true,
          stageName: true,
          photoUrl: true,
          city: true,
        },
      },
      phase: {
        select: { id: true, number: true, title: true, theme: true },
      },
      likes: fanId
        ? { where: { fanId }, select: { id: true } }
        : false,
      _count: { select: { likes: true } },
    },
    orderBy: [
      { phase: { number: "desc" } },
      { candidate: { stageName: "asc" } },
      { createdAt: "desc" },
    ],
  });
}

export async function getPhaseTracksFeed(phaseId: string, fanId?: string | null) {
  return prisma.phaseTrack.findMany({
    where: {
      phaseId,
      candidate: {
        entries: {
          some: {
            phaseId,
            status: "active",
          },
        },
      },
    },
    include: {
      candidate: {
        select: {
          id: true,
          slug: true,
          stageName: true,
          photoUrl: true,
          city: true,
        },
      },
      phase: {
        select: { id: true, number: true, title: true, theme: true },
      },
      likes: fanId
        ? { where: { fanId }, select: { id: true } }
        : false,
      _count: { select: { likes: true } },
    },
    orderBy: [
      { candidate: { stageName: "asc" } },
      { createdAt: "desc" },
    ],
  });
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
