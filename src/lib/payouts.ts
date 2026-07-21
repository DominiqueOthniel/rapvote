import { prisma } from "@/lib/db";

/** Montants déjà réservés ou versés (pending / processing / complete). */
const LOCKED_STATUSES = ["pending", "processing", "complete"] as const;
const REQUEST_LOCKED_STATUSES = ["pending"] as const;

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

export async function getCandidateRequestedXaf(candidateId: string) {
  const result = await prisma.payoutRequest.aggregate({
    where: {
      candidateId,
      status: { in: [...REQUEST_LOCKED_STATUSES] },
    },
    _sum: { amountXaf: true },
  });
  return result._sum.amountXaf ?? 0;
}

export async function getCandidateBalanceDue(candidateId: string, totalEarnedXaf: number) {
  const [paidOrLocked, requested] = await Promise.all([
    getCandidatePaidOutXaf(candidateId),
    getCandidateRequestedXaf(candidateId),
  ]);
  return Math.max(0, totalEarnedXaf - paidOrLocked - requested);
}

export function makePayoutReference() {
  return `FTC-PAY-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}
