import { prisma } from "@/lib/db";
import {
  DEFAULT_VOTE_PACKS,
  priceForVotes,
  votePackLabel,
} from "@/lib/vote-packs";

/** Garantit les packs de votes étendus pour une saison. */
export async function ensureSeasonVotePackages(seasonId: string) {
  const existing = await prisma.votePackage.findMany({
    where: { seasonId },
  });
  const byVotes = new Map(existing.map((p) => [p.votesCount, p]));

  for (const pack of DEFAULT_VOTE_PACKS) {
    const priceXaf = priceForVotes(pack.votesCount);
    const label = votePackLabel(pack.votesCount);
    const found = byVotes.get(pack.votesCount);

    if (!found) {
      await prisma.votePackage.create({
        data: {
          seasonId,
          label,
          votesCount: pack.votesCount,
          priceXaf,
          sortOrder: pack.sortOrder,
          isActive: true,
        },
      });
      continue;
    }

    await prisma.votePackage.update({
      where: { id: found.id },
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
