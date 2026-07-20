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

  const apiOk = keys.baseUrl.includes("api.notchpay.co");
  const keysOk = keyKind === "live";
  // "Payment Not Found" sur une vieille FTC créée avant le fix n'est pas bloquant.
  const staleLookup =
    Boolean(notchError?.toLowerCase().includes("not found")) &&
    Boolean(latest?.campayRef?.startsWith("FTC-"));

  const hint = !keysOk
    ? "NOTCHPAY_PUBLIC_KEY invalide (attendu: pk....)."
    : !apiOk
      ? "Corrige NOTCHPAY_BASE_URL: doit être https://api.notchpay.co"
      : staleLookup
        ? "Clés et API OK. Ancienne transaction fantôme ignorée. Retente un nouveau vote."
        : notchError
          ? `Clés OK mais Notch répond: ${notchError}`
          : "Clés et API OK. Retente un vote.";

  return NextResponse.json({
    ok: keysOk && apiOk && (!notchError || staleLookup),
    configured: true,
    keyKind,
    keys,
    hint,
    latestPending: latest,
    notchStatus,
    notchError: staleLookup ? null : notchError,
  });
}
