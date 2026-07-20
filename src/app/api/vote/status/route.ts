import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getNotchPaymentStatus } from "@/lib/notchpay";
import { confirmTransaction } from "@/lib/votes";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get("ref");
  if (!reference) {
    return NextResponse.json({ error: "Référence manquante" }, { status: 400 });
  }

  const tx = await prisma.transaction.findUnique({
    where: { reference },
    include: { candidate: true, package: true },
  });

  if (!tx) {
    return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
  }

  if (tx.status === "paid") {
    return NextResponse.json({ status: "paid", transaction: tx });
  }

  if (tx.campayRef || tx.reference) {
    try {
      const notchRef = tx.campayRef ?? tx.reference;
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
      console.error("vote status notch", error);
    }
  }

  return NextResponse.json({ status: tx.status, transaction: tx });
}
