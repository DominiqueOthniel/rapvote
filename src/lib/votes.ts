import { prisma } from "@/lib/db";
import { splitAmount } from "@/lib/money";

export async function confirmTransaction(transactionId: string) {
  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!tx) throw new Error("Transaction introuvable");
  if (tx.status === "paid") return tx;

  const { candidateShareXaf, adminShareXaf } = splitAmount(tx.amountXaf);

  return prisma.$transaction(async (db) => {
    const updated = await db.transaction.update({
      where: { id: tx.id },
      data: {
        status: "paid",
        paidAt: new Date(),
        candidateShareXaf,
        adminShareXaf,
      },
    });

    await db.vote.create({
      data: {
        phaseId: tx.phaseId,
        candidateId: tx.candidateId,
        transactionId: tx.id,
        votesCount: tx.votesCount,
      },
    });

    await db.phaseEntry.update({
      where: {
        phaseId_candidateId: {
          phaseId: tx.phaseId,
          candidateId: tx.candidateId,
        },
      },
      data: { votesCount: { increment: tx.votesCount } },
    });

    await db.candidate.update({
      where: { id: tx.candidateId },
      data: {
        totalVotes: { increment: tx.votesCount },
        totalEarnedXaf: { increment: candidateShareXaf },
      },
    });

    return updated;
  });
}
