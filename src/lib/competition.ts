import { prisma } from "@/lib/db";
import { asJuryScoreOutOf100 } from "@/lib/jury";
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
  const tracks = await prisma.phaseTrack.findMany({
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
          entries: {
            select: {
              phaseId: true,
              votesCount: true,
              juryScore: true,
              status: true,
            },
          },
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
  });

  return sortTracksByRanking(tracks);
}

export async function getPhaseTracksFeed(phaseId: string, fanId?: string | null) {
  const tracks = await prisma.phaseTrack.findMany({
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
          entries: {
            where: { phaseId },
            select: {
              phaseId: true,
              votesCount: true,
              juryScore: true,
              status: true,
            },
          },
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
  });

  return sortTracksByRanking(tracks);
}

type TrackRankInput = {
  playCount: number;
  phaseId: string;
  phase: { number: number };
  candidate: {
    stageName: string;
    entries: Array<{
      phaseId: string;
      votesCount: number;
      juryScore: number;
    }>;
  };
};

/** Classement feed: jury ↓, votes ↓, streams ↓. */
function sortTracksByRanking<T extends TrackRankInput>(tracks: T[]): T[] {
  return [...tracks].sort((a, b) => {
    const entryA = a.candidate.entries.find((e) => e.phaseId === a.phaseId);
    const entryB = b.candidate.entries.find((e) => e.phaseId === b.phaseId);

    const juryA = asJuryScoreOutOf100(entryA?.juryScore ?? 0);
    const juryB = asJuryScoreOutOf100(entryB?.juryScore ?? 0);
    if (juryB !== juryA) return juryB - juryA;

    const votesA = entryA?.votesCount ?? 0;
    const votesB = entryB?.votesCount ?? 0;
    if (votesB !== votesA) return votesB - votesA;

    if (b.playCount !== a.playCount) return b.playCount - a.playCount;

    if (b.phase.number !== a.phase.number) {
      return b.phase.number - a.phase.number;
    }

    return a.candidate.stageName.localeCompare(b.candidate.stageName, "fr");
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
