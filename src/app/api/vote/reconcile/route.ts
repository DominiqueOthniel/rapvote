import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getNotchPaymentStatus } from "@/lib/notchpay";
import { confirmTransaction } from "@/lib/votes";

export const dynamic = "force-dynamic";

/**
 * Resynchronise les votes pending avec Notch.
 * Protégé par AUTH_SECRET (header x-reconcile-secret).
 */
export async function POST(request: Request) {
  const secret = process.env.AUTH_SECRET?.trim();
  const provided =
    request.headers.get("x-reconcile-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const pending = await prisma.transaction.findMany({
    where: {
      status: "pending",
      campayRef: { startsWith: "trx." },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  const results: Array<{
    reference: string;
    notchRef: string;
    result: string;
  }> = [];

  for (const tx of pending) {
    const notchRef = tx.campayRef!;
    try {
      const status = await getNotchPaymentStatus(notchRef);
      if (status.status === "complete") {
        await confirmTransaction(tx.id);
        results.push({ reference: tx.reference, notchRef, result: "credited" });
      } else if (
        status.status === "failed" ||
        status.status === "canceled"
      ) {
        await prisma.transaction.update({
          where: { id: tx.id },
          data: { status: "failed" },
        });
        results.push({ reference: tx.reference, notchRef, result: "failed" });
      } else {
        results.push({
          reference: tx.reference,
          notchRef,
          result: status.status,
        });
      }
    } catch (error) {
      results.push({
        reference: tx.reference,
        notchRef,
        result: error instanceof Error ? error.message : "error",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: pending.length,
    credited: results.filter((r) => r.result === "credited").length,
    results,
  });
}

export async function GET(request: Request) {
  return POST(request);
}
