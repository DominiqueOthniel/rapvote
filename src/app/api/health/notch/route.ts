import { NextResponse } from "next/server";
import {
  getNotchPaymentStatus,
  isNotchPayConfigured,
  notchKeyDiagnostics,
  notchPublicKeyKind,
} from "@/lib/notchpay";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isNotchPayConfigured();
  const keyKind = notchPublicKeyKind();
  const keys = notchKeyDiagnostics();

  if (!configured) {
    return NextResponse.json({
      ok: false,
      configured: false,
      keyKind,
      keys,
      message:
        "NOTCHPAY_PUBLIC_KEY ou NOTCHPAY_PRIVATE_KEY manquant sur Netlify",
    });
  }

  const latest = await prisma.transaction.findFirst({
    where: { status: "pending" },
    orderBy: { createdAt: "desc" },
    select: {
      reference: true,
      campayRef: true,
      operator: true,
      amountXaf: true,
      createdAt: true,
    },
  });

  let notchStatus: string | null = null;
  let notchError: string | null = null;

  if (latest?.campayRef) {
    try {
      const status = await getNotchPaymentStatus(latest.campayRef);
      notchStatus = status.status;
    } catch (error) {
      notchError = error instanceof Error ? error.message : String(error);
    }
  }

  const hint =
    keyKind === "test"
      ? "Clés TEST: aucun vrai push Orange/MTN. Mets les clés live."
      : keyKind === "live"
        ? keys.baseUrl.includes("api.notchpay.co")
          ? "Clés et API OK. Retente un vote."
          : "Corrige NOTCHPAY_BASE_URL: doit être https://api.notchpay.co"
        : "NOTCHPAY_PUBLIC_KEY invalide (attendu: pk....).";

  return NextResponse.json({
    ok: keyKind === "live" && !notchError && keys.baseUrl.includes("api.notchpay.co"),
    configured: true,
    keyKind,
    keys,
    hint,
    latestPending: latest,
    notchStatus,
    notchError,
  });
}
