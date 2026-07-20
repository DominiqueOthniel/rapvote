import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  collectVotePayment,
  isNotchPayConfigured,
} from "@/lib/notchpay";
import { normalizeCameroonPhone } from "@/lib/money";
import { confirmTransaction } from "@/lib/votes";

const schema = z.object({
  candidateId: z.string().min(1),
  packageId: z.string().min(1),
  phaseId: z.string().min(1),
  phone: z.string().min(8),
  operator: z.enum(["ORANGE", "MTN"]),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const phone = normalizeCameroonPhone(parsed.data.phone);
    if (phone.length < 12) {
      return NextResponse.json(
        { error: "Numéro camerounais invalide. Exemple: 6XX XXX XXX" },
        { status: 400 },
      );
    }

    const [candidate, votePackage, phase, entry] = await Promise.all([
      prisma.candidate.findUnique({ where: { id: parsed.data.candidateId } }),
      prisma.votePackage.findUnique({ where: { id: parsed.data.packageId } }),
      prisma.phase.findUnique({ where: { id: parsed.data.phaseId } }),
      prisma.phaseEntry.findUnique({
        where: {
          phaseId_candidateId: {
            phaseId: parsed.data.phaseId,
            candidateId: parsed.data.candidateId,
          },
        },
      }),
    ]);

    if (!candidate || !votePackage || !phase) {
      return NextResponse.json({ error: "Candidat ou pack introuvable" }, { status: 404 });
    }

    if (phase.status !== "active") {
      return NextResponse.json(
        { error: "Cette phase n'accepte plus les votes" },
        { status: 400 },
      );
    }

    if (phase.votesOpen === false) {
      return NextResponse.json(
        { error: "Les votes sont bloqués par l'administration pour cette phase." },
        { status: 400 },
      );
    }

    if (!entry || entry.status !== "active") {
      return NextResponse.json(
        { error: "Ce candidat n'est pas en lice sur cette phase" },
        { status: 400 },
      );
    }

    const reference = `FTC-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const transaction = await prisma.transaction.create({
      data: {
        reference,
        phaseId: phase.id,
        candidateId: candidate.id,
        packageId: votePackage.id,
        voterPhone: phone,
        operator: parsed.data.operator,
        votesCount: votePackage.votesCount,
        amountXaf: votePackage.priceXaf,
        status: "pending",
      },
    });

    const origin = new URL(request.url).origin;
    const payment = await collectVotePayment({
      amountXaf: votePackage.priceXaf,
      phone,
      operator: parsed.data.operator,
      reference,
      description: `ForTheCulture ${votePackage.votesCount} vote(s) pour ${candidate.stageName}`,
      callbackUrl: `${origin}/vote/succes?ref=${reference}`,
    });

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { campayRef: payment.reference },
    });

    if (!isNotchPayConfigured() || payment.mode === "demo") {
      await confirmTransaction(transaction.id);
      return NextResponse.json({
        ok: true,
        mode: "demo",
        reference,
        message:
          "Mode démo : Notch Pay non configuré. Vote confirmé sans vrai paiement.",
        redirect: `/vote/succes?ref=${reference}`,
      });
    }

    return NextResponse.json({
      ok: true,
      mode: "live",
      reference,
      paymentRef: payment.reference,
      message: "Valide le paiement sur ton téléphone (Orange Money ou MTN Money).",
      redirect: `/vote/succes?ref=${reference}`,
    });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Impossible de lancer le paiement";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
