import { prisma } from "@/lib/db";
import { getNotchPaymentStatus, normalizeNotchStatus } from "@/lib/notchpay";
import { confirmTransaction } from "@/lib/votes";

export type ReconcileItem = {
  reference: string;
  notchRef: string;
  result: string;
  votesCount?: number;
};

/**
 * Vérifie Notch pour chaque paiement pending et crédite les votes si complete.
 * Idempotent: confirmTransaction ne double-compte pas.
 */
export async function reconcilePendingVotes(limit = 40): Promise<{
  scanned: number;
  credited: number;
  failed: number;
  results: ReconcileItem[];
}> {
  const pending = await prisma.transaction.findMany({
    where: {
      status: "pending",
      OR: [
        { campayRef: { startsWith: "trx." } },
        { campayRef: { startsWith: "pay_" } },
        { campayRef: { not: null } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  const results: ReconcileItem[] = [];
  let credited = 0;
  let failed = 0;

  for (const tx of pending) {
    const notchRef = tx.campayRef ?? tx.reference;
    try {
      const status = await getNotchPaymentStatus(notchRef);
      const normalized = normalizeNotchStatus(status.status);

      if (normalized === "complete") {
        await confirmTransaction(tx.id);
        credited += 1;
        results.push({
          reference: tx.reference,
          notchRef,
          result: "credited",
          votesCount: tx.votesCount,
        });
        continue;
      }

      if (normalized === "failed" || normalized === "canceled") {
        await prisma.transaction.update({
          where: { id: tx.id },
          data: { status: "failed" },
        });
        failed += 1;
        results.push({ reference: tx.reference, notchRef, result: "failed" });
        continue;
      }

      // Aussi tenter avec la référence marchande FTC-...
      if (notchRef !== tx.reference) {
        const byMerchant = await getNotchPaymentStatus(tx.reference);
        const merchantStatus = normalizeNotchStatus(byMerchant.status);
        if (merchantStatus === "complete") {
          await confirmTransaction(tx.id);
          credited += 1;
          results.push({
            reference: tx.reference,
            notchRef: tx.reference,
            result: "credited",
            votesCount: tx.votesCount,
          });
          continue;
        }
      }

      results.push({
        reference: tx.reference,
        notchRef,
        result: normalized,
      });
    } catch (error) {
      results.push({
        reference: tx.reference,
        notchRef,
        result: error instanceof Error ? error.message : "error",
      });
    }
  }

  return {
    scanned: pending.length,
    credited,
    failed,
    results,
  };
}
