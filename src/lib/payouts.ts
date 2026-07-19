import { prisma } from "@/lib/db";

/** Montants déjà réservés ou versés (pending / processing / complete). */
const LOCKED_STATUSES = ["pending", "processing", "complete"] as const;

export async function getCandidatePaidOutXaf(candidateId: string) {
  const result = await prisma.payout.aggregate({
    where: {
      candidateId,
      status: { in: [...LOCKED_STATUSES] },
    },
    _sum: { amountXaf: true },
  });
  return result._sum.amountXaf ?? 0;
}

export async function getCandidateBalanceDue(candidateId: string, totalEarnedXaf: number) {
  const paidOrLocked = await getCandidatePaidOutXaf(candidateId);
  return Math.max(0, totalEarnedXaf - paidOrLocked);
}

export function makePayoutReference() {
  return `FTC-PAY-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}
