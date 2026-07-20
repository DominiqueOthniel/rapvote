import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getNotchPaymentStatus } from "@/lib/notchpay";
import { confirmTransaction } from "@/lib/votes";
import { reconcilePendingVotes } from "@/lib/reconcile-votes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reference =
    searchParams.get("ref") ??
    searchParams.get("reference") ??
    searchParams.get("trxref");

  // Filet de sécurité: à chaque check, on rattrape aussi d'autres paiements orphelins.
  void reconcilePendingVotes(8).catch((error) => {
    console.error("background reconcile", error);
  });

  if (!reference) {
    return NextResponse.json({ error: "Référence manquante" }, { status: 400 });
  }

  let tx = await prisma.transaction.findUnique({
    where: { reference },
    include: { candidate: true, package: true },
  });

  if (!tx) {
    tx = await prisma.transaction.findFirst({
      where: { campayRef: reference },
      include: { candidate: true, package: true },
    });
  }

  if (!tx) {
    return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
  }

  if (tx.status === "paid") {
    return NextResponse.json({ status: "paid", transaction: tx });
  }

  const refsToTry = [tx.campayRef, tx.reference].filter(
    (value): value is string => Boolean(value),
  );

  for (const notchRef of refsToTry) {
    try {
      const status = await getNotchPaymentStatus(notchRef);
      if (status.status === "complete") {
        const confirmed = await confirmTransaction(tx.id);
        return NextResponse.json({ status: "paid", transaction: confirmed });
      }
      if (status.status === "failed" || status.status === "canceled") {
        const failed = await prisma.transaction.update({
          where: { id: tx.id },
          data: { status: "failed" },
          include: { candidate: true, package: true },
        });
        return NextResponse.json({ status: "failed", transaction: failed });
      }
    } catch (error) {
      console.error("vote status notch", notchRef, error);
    }
  }

  const fresh = await prisma.transaction.findUnique({
    where: { id: tx.id },
    include: { candidate: true, package: true },
  });

  return NextResponse.json({
    status: fresh?.status ?? tx.status,
    transaction: fresh ?? tx,
  });
}
