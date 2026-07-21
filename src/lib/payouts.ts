import { prisma } from "@/lib/db";

/** Versements Notch réellement envoyés / terminés. */
const NOTCH_PAID_STATUSES = ["complete"] as const;
/** Versements Notch encore en traitement. */
const NOTCH_IN_PROGRESS_STATUSES = ["pending", "processing"] as const;

/** Demandes artiste marquées payées par l'admin. */
const REQUEST_PAID_STATUSES = ["paid"] as const;
/** Demandes en attente ou vues / approuvées. */
const REQUEST_IN_PROGRESS_STATUSES = ["pending", "approved"] as const;

async function sumPayouts(candidateId: string, statuses: readonly string[]) {
  const result = await prisma.payout.aggregate({
    where: { candidateId, status: { in: [...statuses] } },
    _sum: { amountXaf: true },
  });
  return result._sum.amountXaf ?? 0;
}

async function sumRequests(candidateId: string, statuses: readonly string[]) {
  const result = await prisma.payoutRequest.aggregate({
    where: { candidateId, status: { in: [...statuses] } },
    _sum: { amountXaf: true },
  });
  return result._sum.amountXaf ?? 0;
}

/** Montant confirmé versé (Notch complete + demandes marquées payées). */
export async function getCandidatePaidConfirmedXaf(candidateId: string) {
  const [notch, requests] = await Promise.all([
    sumPayouts(candidateId, NOTCH_PAID_STATUSES),
    sumRequests(candidateId, REQUEST_PAID_STATUSES),
  ]);
  return notch + requests;
}

/** Montant encore en cours (Notch pending/processing + demandes pending/approved). */
export async function getCandidateInProgressXaf(candidateId: string) {
  const [notch, requests] = await Promise.all([
    sumPayouts(candidateId, NOTCH_IN_PROGRESS_STATUSES),
    sumRequests(candidateId, REQUEST_IN_PROGRESS_STATUSES),
  ]);
  return notch + requests;
}

/**
 * Total déjà réservé ou versé (bloque le solde disponible).
 * Inclut en cours + déjà payé.
 */
export async function getCandidatePaidOutXaf(candidateId: string) {
  const [paid, inProgress] = await Promise.all([
    getCandidatePaidConfirmedXaf(candidateId),
    getCandidateInProgressXaf(candidateId),
  ]);
  return paid + inProgress;
}

/** @deprecated alias historique */
export async function getCandidateNotchPaidOutXaf(candidateId: string) {
  return sumPayouts(candidateId, [
    ...NOTCH_PAID_STATUSES,
    ...NOTCH_IN_PROGRESS_STATUSES,
  ]);
}

/** @deprecated use getCandidateInProgressXaf */
export async function getCandidateRequestLockedXaf(candidateId: string) {
  return sumRequests(candidateId, [
    ...REQUEST_IN_PROGRESS_STATUSES,
    ...REQUEST_PAID_STATUSES,
  ]);
}

/** @deprecated */
export async function getCandidateRequestedXaf(candidateId: string) {
  return sumRequests(candidateId, ["pending"]);
}

export async function getCandidateBalanceDue(
  candidateId: string,
  totalEarnedXaf: number,
) {
  const paidOrLocked = await getCandidatePaidOutXaf(candidateId);
  return Math.max(0, totalEarnedXaf - paidOrLocked);
}

export function makePayoutReference() {
  return `FTC-PAY-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}
