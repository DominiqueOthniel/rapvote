import { prisma } from "@/lib/db";
import { splitAmount } from "@/lib/money";

/**
 * Passe une transaction pending → paid et crédite exactement votesCount.
 * Idempotent (safe sous webhook + polling + reconcile).
 */
export async function confirmTransaction(transactionId: string) {
  const existing = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!existing) throw new Error("Transaction introuvable");
  if (existing.status === "paid") {
    return prisma.transaction.findUniqueOrThrow({
      where: { id: transactionId },
      include: { candidate: true, package: true },
    });
  }

  const { candidateShareXaf, adminShareXaf } = splitAmount(existing.amountXaf);

  await prisma.$transaction(async (db) => {
    const locked = await db.transaction.findUnique({
      where: { id: transactionId },
    });
    if (!locked) throw new Error("Transaction introuvable");
    if (locked.status === "paid") return;

    const updated = await db.transaction.updateMany({
      where: { id: transactionId, status: "pending" },
      data: {
        status: "paid",
        paidAt: new Date(),
        candidateShareXaf,
        adminShareXaf,
      },
    });

    // Un autre process a déjà confirmé entre-temps.
    if (updated.count === 0) return;

    const alreadyVoted = await db.vote.findFirst({
      where: { transactionId },
    });
    if (alreadyVoted) return;

    await db.vote.create({
      data: {
        phaseId: locked.phaseId,
        candidateId: locked.candidateId,
        transactionId: locked.id,
        votesCount: locked.votesCount,
      },
    });

    await db.phaseEntry.update({
      where: {
        phaseId_candidateId: {
          phaseId: locked.phaseId,
          candidateId: locked.candidateId,
        },
      },
      data: { votesCount: { increment: locked.votesCount } },
    });

    await db.candidate.update({
      where: { id: locked.candidateId },
      data: {
        totalVotes: { increment: locked.votesCount },
        totalEarnedXaf: { increment: candidateShareXaf },
      },
    });
  });

  return prisma.transaction.findUniqueOrThrow({
    where: { id: transactionId },
    include: { candidate: true, package: true },
  });
}
