import { prisma } from "@/lib/db";
import {
  DEFAULT_VOTE_PACKS,
  priceForVotes,
  votePackLabel,
} from "@/lib/vote-packs";

/** Garantit une liste courte de packs uniques, sans doublons. */
export async function ensureSeasonVotePackages(seasonId: string) {
  const wanted = new Set(DEFAULT_VOTE_PACKS.map((p) => p.votesCount));
  const existing = await prisma.votePackage.findMany({
    where: { seasonId },
    orderBy: { createdAt: "asc" },
  });

  const keepByVotes = new Map<number, string>();

  for (const pack of existing) {
    if (!wanted.has(pack.votesCount)) {
      if (pack.isActive) {
        await prisma.votePackage.update({
          where: { id: pack.id },
          data: { isActive: false },
        });
      }
      continue;
    }

    const keptId = keepByVotes.get(pack.votesCount);
    if (!keptId) {
      keepByVotes.set(pack.votesCount, pack.id);
      continue;
    }

    // Doublon : on désactive les copies.
    if (pack.isActive) {
      await prisma.votePackage.update({
        where: { id: pack.id },
        data: { isActive: false },
      });
    }
  }

  for (const pack of DEFAULT_VOTE_PACKS) {
    const priceXaf = priceForVotes(pack.votesCount);
    const label = votePackLabel(pack.votesCount);
    const keptId = keepByVotes.get(pack.votesCount);

    if (!keptId) {
      const created = await prisma.votePackage.create({
        data: {
          seasonId,
          label,
          votesCount: pack.votesCount,
          priceXaf,
          sortOrder: pack.sortOrder,
          isActive: true,
        },
      });
      keepByVotes.set(pack.votesCount, created.id);
      continue;
    }

    await prisma.votePackage.update({
      where: { id: keptId },
      data: {
        label,
        priceXaf,
        sortOrder: pack.sortOrder,
        isActive: true,
      },
    });
  }

  return prisma.votePackage.findMany({
    where: { seasonId, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}
