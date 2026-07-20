import { NextResponse } from "next/server";
import {
  getNotchPaymentStatus,
  isNotchPayConfigured,
  notchPublicKeyKind,
} from "@/lib/notchpay";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isNotchPayConfigured();
  const keyKind = notchPublicKeyKind();

  if (!configured) {
    return NextResponse.json({
      ok: false,
      configured: false,
      keyKind,
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

  return NextResponse.json({
    ok: keyKind === "live",
    configured: true,
    keyKind,
    hint:
      keyKind === "test"
        ? "Clés TEST détectées: aucun vrai push Orange/MTN. Utilise pk_live_ / sk_live_."
        : keyKind === "live"
          ? "Clés LIVE OK. Si pas de push, vérifie le numéro et l'opérateur dans Notch Business."
          : "Préfixe de clé inconnu. Vérifie NOTCHPAY_PUBLIC_KEY.",
    latestPending: latest,
    notchStatus,
    notchError,
  });
}
