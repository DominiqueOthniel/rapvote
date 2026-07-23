import { prisma } from "@/lib/db";
import {
  asJuryScoreOutOf100,
  isScoringPhaseNumber,
} from "@/lib/jury-score";
import {
  getMaxVotes,
  phaseFinalScore,
  sortByFinalScore,
} from "@/lib/scoring";
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

export async function getPhaseRanking(
  phaseId: string,
  options?: { syncVotes?: boolean },
) {
  if (options?.syncVotes !== false) {
    await syncPhaseEntryVotes(phaseId);
  }

  const phase = await prisma.phase.findUnique({ where: { id: phaseId } });
  const [entries, tracks] = await Promise.all([
    prisma.phaseEntry.findMany({
      where: { phaseId, status: "active" },
      include: { candidate: true },
    }),
    prisma.phaseTrack.findMany({
      where: { phaseId },
      select: { candidateId: true, lateSubmission: true },
    }),
  ]);
  const lateByCandidate = new Map(
    tracks.map((track) => [track.candidateId, track.lateSubmission]),
  );

  const scored = entries.map((entry) => ({
    ...entry,
    votesCount: cumulativeVotes(entry),
    lateSubmission: lateByCandidate.get(entry.candidateId) ?? false,
  }));

  return sortByFinalScore(scored, phase?.number ?? 0);
}

export async function getPhaseEntries(
  phaseId: string,
  options?: { syncVotes?: boolean },
) {
  if (options?.syncVotes !== false) {
    await syncPhaseEntryVotes(phaseId);
  }

  const phase = await prisma.phase.findUnique({ where: { id: phaseId } });
  const [entries, tracks] = await Promise.all([
    prisma.phaseEntry.findMany({
      where: { phaseId },
      include: {
        candidate: true,
        _count: { select: { juryScores: true } },
      },
    }),
    prisma.phaseTrack.findMany({
      where: { phaseId },
      select: { candidateId: true, lateSubmission: true },
    }),
  ]);
  const lateByCandidate = new Map(
    tracks.map((track) => [track.candidateId, track.lateSubmission]),
  );

  const phaseNumber = phase?.number ?? 0;
  const withVotes = entries.map((entry) => ({
    ...entry,
    votesCount: cumulativeVotes(entry),
    lateSubmission: lateByCandidate.get(entry.candidateId) ?? false,
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

/**
 * Points cumulés sur le parcours (somme des scores), hors phase 0.
 * syncVotes=false: lecture seule, plus rapide (feed sons / UI).
 */
export async function getCandidateCumulativeScores(
  seasonId: string,
  options?: { syncVotes?: boolean },
) {
  const syncVotes = options?.syncVotes !== false;
  const phases = await prisma.phase.findMany({
    where: { seasonId },
    select: { id: true, number: true },
    orderBy: { number: "asc" },
  });

  const scoringPhases = phases.filter((phase) =>
    isScoringPhaseNumber(phase.number),
  );
  const scoringPhaseCount = scoringPhases.length;

  if (scoringPhases.length === 0) {
    return {
      scores: new Map<string, number>(),
      scoringPhaseCount: 0,
    };
  }

  if (syncVotes) {
    await Promise.all(
      scoringPhases.map((phase) => syncPhaseEntryVotes(phase.id)),
    );
  }

  const scoringPhaseIds = new Set(scoringPhases.map((phase) => phase.id));
  const [entries, tracks] = await Promise.all([
    prisma.phaseEntry.findMany({
      where: { phaseId: { in: [...scoringPhaseIds] } },
      include: {
        candidate: { select: { id: true, totalVotes: true } },
        phase: { select: { id: true, number: true } },
      },
    }),
    prisma.phaseTrack.findMany({
      where: { phaseId: { in: [...scoringPhaseIds] } },
      select: {
        candidateId: true,
        phaseId: true,
        lateSubmission: true,
      },
    }),
  ]);

  const lateByEntry = new Map(
    tracks.map((track) => [
      `${track.candidateId}:${track.phaseId}`,
      track.lateSubmission,
    ]),
  );

  const maxVotesByPhase = new Map<string, number>();
  const byPhase = new Map<string, typeof entries>();
  for (const entry of entries) {
    const list = byPhase.get(entry.phaseId) ?? [];
    list.push(entry);
    byPhase.set(entry.phaseId, list);
  }

  for (const [phaseId, list] of byPhase) {
    maxVotesByPhase.set(
      phaseId,
      getMaxVotes(
        list.map((entry) => ({
          votesCount: cumulativeVotes(entry),
          juryScore: entry.juryScore,
        })),
      ),
    );
  }

  const scores = new Map<string, number>();
  for (const entry of entries) {
    if (!isScoringPhaseNumber(entry.phase.number)) continue;
    const score = phaseFinalScore(
      {
        votesCount: cumulativeVotes(entry),
        juryScore: entry.juryScore,
        lateSubmission:
          lateByEntry.get(`${entry.candidateId}:${entry.phaseId}`) ?? false,
      },
      maxVotesByPhase.get(entry.phaseId) ?? 0,
      entry.phase.number,
    );
    scores.set(entry.candidateId, (scores.get(entry.candidateId) ?? 0) + score);
  }

  return { scores, scoringPhaseCount };
}

/** Classement compétition: points cumulés du parcours, phase courante pour le roster. */
export async function getCompetitionStandings(seasonId: string) {
  const phase = await getCurrentPhase(seasonId);
  if (!phase) {
    return {
      phase: null,
      scoringPhaseCount: 0,
      standings: [] as Array<
        Awaited<ReturnType<typeof getPhaseEntries>>[number] & {
          cumulativeScore: number;
        }
      >,
    };
  }

  const [entries, board] = await Promise.all([
    // Lecture publique: pas de sync (votes via candidate.totalVotes).
    getPhaseEntries(phase.id, { syncVotes: false }),
    getCandidateCumulativeScores(seasonId, { syncVotes: false }),
  ]);

  const standings = [...entries]
    .map((entry) => ({
      ...entry,
      cumulativeScore: board.scores.get(entry.candidateId) ?? 0,
    }))
    .sort((a, b) => {
      const activeA = a.status === "active";
      const activeB = b.status === "active";
      if (activeA !== activeB) return activeA ? -1 : 1;

      if (b.cumulativeScore !== a.cumulativeScore) {
        return b.cumulativeScore - a.cumulativeScore;
      }

      const juryA = asJuryScoreOutOf100(a.juryScore);
      const juryB = asJuryScoreOutOf100(b.juryScore);
      if (juryB !== juryA) return juryB - juryA;

      return b.votesCount - a.votesCount;
    });

  return {
    phase,
    standings,
    scoringPhaseCount: board.scoringPhaseCount,
  };
}

export async function getSeasonTracksFeed(
  seasonId: string,
  fanId?: string | null,
) {
  const [tracks, board] = await Promise.all([
    prisma.phaseTrack.findMany({
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
                status: true,
              },
            },
          },
        },
        phase: {
          select: {
            id: true,
            number: true,
            title: true,
            theme: true,
            submissionDeadlineAt: true,
          },
        },
        likes: fanId
          ? { where: { fanId }, select: { id: true } }
          : false,
        _count: { select: { likes: true } },
      },
    }),
    // Pas de sync votes: le feed doit rester rapide.
    getCandidateCumulativeScores(seasonId, { syncVotes: false }),
  ]);

  return sortTracksByRanking(tracks, board.scores);
}

export async function getPhaseTracksFeed(phaseId: string, fanId?: string | null) {
  const phase = await prisma.phase.findUnique({
    where: { id: phaseId },
    select: { id: true, seasonId: true },
  });
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
              status: true,
            },
          },
        },
      },
      phase: {
        select: {
          id: true,
          number: true,
          title: true,
          theme: true,
          submissionDeadlineAt: true,
        },
      },
      likes: fanId
        ? { where: { fanId }, select: { id: true } }
        : false,
      _count: { select: { likes: true } },
    },
  });

  const board = phase
    ? await getCandidateCumulativeScores(phase.seasonId, { syncVotes: false })
    : { scores: new Map<string, number>(), scoringPhaseCount: 0 };
  return sortTracksByRanking(tracks, board.scores);
}

type TrackRankInput = {
  playCount: number;
  phaseId: string;
  phase: { number: number };
  candidate: {
    id: string;
    stageName: string;
    entries: Array<{
      phaseId: string;
      status?: string;
    }>;
  };
};

/**
 * Sons des premiers au classement parcours (points cumulés) en tête.
 */
function sortTracksByRanking<T extends TrackRankInput>(
  tracks: T[],
  cumulative: Map<string, number>,
): T[] {
  return [...tracks].sort((a, b) => {
    const entryA = a.candidate.entries.find((e) => e.phaseId === a.phaseId);
    const entryB = b.candidate.entries.find((e) => e.phaseId === b.phaseId);
    const activeA = entryA?.status !== "eliminated";
    const activeB = entryB?.status !== "eliminated";
    if (activeA !== activeB) return activeA ? -1 : 1;

    const scoreA = cumulative.get(a.candidate.id) ?? 0;
    const scoreB = cumulative.get(b.candidate.id) ?? 0;
    if (scoreB !== scoreA) return scoreB - scoreA;

    // Même rang parcours: épisode récent, puis streams
    if (b.phase.number !== a.phase.number) {
      return b.phase.number - a.phase.number;
    }

    if (b.playCount !== a.playCount) return b.playCount - a.playCount;

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
