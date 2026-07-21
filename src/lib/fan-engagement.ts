import { prisma } from "@/lib/db";
import { STREAK_REWARD_STREAMS } from "@/lib/fan-engagement-constants";

export { STREAK_REWARD_STREAMS } from "@/lib/fan-engagement-constants";

export type FanEngagementSnapshot = {
  streakCount: number;
  freeVotes: number;
  streakBadgeEarned: boolean;
  lastListenDay: string | null;
  streamsToReward: number;
  rewardedNow: boolean;
};

/** Jour calendaire Cameroun (Africa/Douala), format YYYY-MM-DD. */
export function cameroonDayKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Douala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function shiftDayKey(dayKey: string, deltaDays: number) {
  const [year, month, day] = dayKey.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + deltaDays));
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utc.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function startOfCameroonDay(date = new Date()) {
  const key = cameroonDayKey(date);
  return new Date(`${key}T00:00:00+01:00`);
}

function snapshotFromFan(
  fan: {
    streakCount: number;
    freeVotes: number;
    streakBadgeEarned: boolean;
    lastListenDay: string | null;
  },
  rewardedNow = false,
): FanEngagementSnapshot {
  const progress = fan.streakCount % STREAK_REWARD_STREAMS;
  const streamsToReward =
    progress === 0 && fan.streakCount > 0
      ? STREAK_REWARD_STREAMS
      : STREAK_REWARD_STREAMS - progress;

  return {
    streakCount: fan.streakCount,
    freeVotes: fan.freeVotes,
    streakBadgeEarned: fan.streakBadgeEarned,
    lastListenDay: fan.lastListenDay,
    streamsToReward:
      fan.streakCount === 0 ? STREAK_REWARD_STREAMS : streamsToReward,
    rewardedNow,
  };
}

export async function getFanEngagement(fanId: string) {
  const fan = await prisma.fan.findUnique({
    where: { id: fanId },
    select: {
      streakCount: true,
      freeVotes: true,
      streakBadgeEarned: true,
      lastListenDay: true,
    },
  });
  if (!fan) return null;
  return snapshotFromFan(fan);
}

/**
 * Enregistre une écoute comptée: historique, event FOMO,
 * compteur de streams (+ vote gratuit tous les 10 streams).
 */
export async function recordCountedListen(args: {
  trackId: string;
  fanId?: string | null;
}) {
  const today = cameroonDayKey();

  await prisma.trackPlayEvent.create({
    data: {
      trackId: args.trackId,
      fanId: args.fanId ?? null,
    },
  });

  if (!args.fanId) return null;

  await prisma.fanListenHistory.upsert({
    where: {
      fanId_trackId: {
        fanId: args.fanId,
        trackId: args.trackId,
      },
    },
    create: {
      fanId: args.fanId,
      trackId: args.trackId,
      listenedAt: new Date(),
    },
    update: {
      listenedAt: new Date(),
    },
  });

  const fan = await prisma.fan.findUnique({
    where: { id: args.fanId },
    select: {
      id: true,
      streakCount: true,
      lastListenDay: true,
      freeVotes: true,
      streakBadgeEarned: true,
    },
  });
  if (!fan) return null;

  const nextStreak = fan.streakCount + 1;
  const rewardedNow = nextStreak % STREAK_REWARD_STREAMS === 0;

  const updated = await prisma.fan.update({
    where: { id: fan.id },
    data: {
      streakCount: nextStreak,
      lastListenDay: today,
      ...(rewardedNow
        ? {
            freeVotes: { increment: 1 },
            streakBadgeEarned: true,
          }
        : {}),
    },
    select: {
      streakCount: true,
      freeVotes: true,
      streakBadgeEarned: true,
      lastListenDay: true,
    },
  });

  return snapshotFromFan(updated, rewardedNow);
}

export async function redeemFreeVote(args: {
  fanId: string;
  fanName: string;
  fanPhone: string;
  candidateId: string;
  phaseId: string;
}) {
  const fan = await prisma.fan.findUnique({
    where: { id: args.fanId },
    select: { id: true, freeVotes: true, name: true, phone: true },
  });
  if (!fan || fan.freeVotes < 1) {
    throw new Error("Aucun vote gratuit disponible");
  }

  const [candidate, phase, entry] = await Promise.all([
    prisma.candidate.findUnique({ where: { id: args.candidateId } }),
    prisma.phase.findUnique({ where: { id: args.phaseId } }),
    prisma.phaseEntry.findUnique({
      where: {
        phaseId_candidateId: {
          phaseId: args.phaseId,
          candidateId: args.candidateId,
        },
      },
    }),
  ]);

  if (!candidate || !phase) throw new Error("Candidat ou phase introuvable");
  if (phase.status !== "active") {
    throw new Error("Cette phase n'accepte plus les votes");
  }
  if (phase.votesOpen === false) {
    throw new Error("Les votes sont bloqués pour cette phase");
  }
  if (!entry || entry.status !== "active") {
    throw new Error("Ce candidat n'est pas en lice sur cette phase");
  }

  const unitPack =
    (await prisma.votePackage.findFirst({
      where: {
        seasonId: candidate.seasonId,
        votesCount: 1,
        isActive: true,
      },
    })) ??
    (await prisma.votePackage.findFirst({
      where: { seasonId: candidate.seasonId, isActive: true },
      orderBy: { sortOrder: "asc" },
    }));

  if (!unitPack) {
    throw new Error("Aucun pack de votes configuré");
  }

  const reference = `FREE-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  await prisma.$transaction(async (db) => {
    const spent = await db.fan.updateMany({
      where: { id: args.fanId, freeVotes: { gte: 1 } },
      data: { freeVotes: { decrement: 1 } },
    });
    if (spent.count === 0) {
      throw new Error("Aucun vote gratuit disponible");
    }

    const transaction = await db.transaction.create({
      data: {
        reference,
        phaseId: phase.id,
        candidateId: candidate.id,
        packageId: unitPack.id,
        voterPhone: args.fanPhone || fan.phone,
        voterName: args.fanName || fan.name,
        operator: "FREE",
        votesCount: 1,
        amountXaf: 0,
        candidateShareXaf: 0,
        adminShareXaf: 0,
        status: "paid",
        paidAt: new Date(),
      },
    });

    await db.vote.create({
      data: {
        phaseId: phase.id,
        candidateId: candidate.id,
        transactionId: transaction.id,
        votesCount: 1,
      },
    });

    const updatedCandidate = await db.candidate.update({
      where: { id: candidate.id },
      data: { totalVotes: { increment: 1 } },
      select: { totalVotes: true },
    });

    await db.phaseEntry.update({
      where: {
        phaseId_candidateId: {
          phaseId: phase.id,
          candidateId: candidate.id,
        },
      },
      data: { votesCount: updatedCandidate.totalVotes },
    });
  });

  const next = await getFanEngagement(args.fanId);
  return { reference, engagement: next };
}

const trackCardSelect = {
  id: true,
  title: true,
  audioUrl: true,
  lyrics: true,
  playCount: true,
  candidate: {
    select: {
      slug: true,
      stageName: true,
      photoUrl: true,
    },
  },
  phase: {
    select: { id: true, number: true, title: true, theme: true },
  },
  _count: { select: { likes: true } },
} as const;

export async function getFanPlaylist(fanId: string, limit = 40) {
  return prisma.fanPlaylistItem.findMany({
    where: { fanId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { track: { select: trackCardSelect } },
  });
}

export async function getFanListenHistory(fanId: string, limit = 40) {
  return prisma.fanListenHistory.findMany({
    where: { fanId },
    orderBy: { listenedAt: "desc" },
    take: limit,
    include: { track: { select: trackCardSelect } },
  });
}

export async function getTodayBuzz(args?: {
  phaseId?: string | null;
  trackIds?: string[];
}) {
  const since = startOfCameroonDay();
  const trackFilter = {
    ...(args?.phaseId ? { phaseId: args.phaseId } : {}),
    ...(args?.trackIds?.length ? { id: { in: args.trackIds } } : {}),
  };

  const [playsToday, likesToday, playsByTrack, likesByTrack] =
    await Promise.all([
      prisma.trackPlayEvent.count({
        where: {
          createdAt: { gte: since },
          ...(Object.keys(trackFilter).length
            ? { track: trackFilter }
            : {}),
        },
      }),
      prisma.trackLike.count({
        where: {
          createdAt: { gte: since },
          ...(Object.keys(trackFilter).length
            ? { track: trackFilter }
            : {}),
        },
      }),
      prisma.trackPlayEvent.groupBy({
        by: ["trackId"],
        where: {
          createdAt: { gte: since },
          ...(Object.keys(trackFilter).length
            ? { track: trackFilter }
            : {}),
        },
        _count: { _all: true },
      }),
      prisma.trackLike.groupBy({
        by: ["trackId"],
        where: {
          createdAt: { gte: since },
          ...(Object.keys(trackFilter).length
            ? { track: trackFilter }
            : {}),
        },
        _count: { _all: true },
      }),
    ]);

  const byTrack: Record<string, { plays: number; likes: number }> = {};
  for (const row of playsByTrack) {
    byTrack[row.trackId] = {
      plays: row._count._all,
      likes: byTrack[row.trackId]?.likes ?? 0,
    };
  }
  for (const row of likesByTrack) {
    byTrack[row.trackId] = {
      plays: byTrack[row.trackId]?.plays ?? 0,
      likes: row._count._all,
    };
  }

  return { playsToday, likesToday, byTrack, since: since.toISOString() };
}
