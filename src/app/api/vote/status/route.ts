import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPaymentStatus } from "@/lib/campay";
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

  if (tx.campayRef) {
    const status = await getPaymentStatus(tx.campayRef);
    if (status.status === "SUCCESSFUL") {
      const confirmed = await confirmTransaction(tx.id);
      return NextResponse.json({ status: "paid", transaction: confirmed });
    }
    if (status.status === "FAILED") {
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { status: "failed" },
      });
      return NextResponse.json({ status: "failed", transaction: tx });
    }
  }

  return NextResponse.json({ status: tx.status, transaction: tx });
}
