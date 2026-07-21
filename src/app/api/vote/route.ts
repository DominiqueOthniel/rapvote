import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  collectVotePayment,
  isNotchPayConfigured,
} from "@/lib/notchpay";
import { normalizeCameroonPhone } from "@/lib/money";
import { confirmTransaction } from "@/lib/votes";
import {
  MAX_CUSTOM_VOTES,
  priceForVotes,
} from "@/lib/vote-packs";

const schema = z
  .object({
    candidateId: z.string().min(1),
    phaseId: z.string().min(1),
    voterName: z.string().trim().min(2).max(60),
    phone: z.string().min(8),
    operator: z.enum(["ORANGE", "MTN"]),
    packageId: z.string().min(1).optional(),
    customVotes: z.number().int().min(1).max(MAX_CUSTOM_VOTES).optional(),
  })
  .refine((data) => Boolean(data.packageId) || Boolean(data.customVotes), {
    message: "Pack ou nombre de votes requis",
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

    const [candidate, phase, entry] = await Promise.all([
      prisma.candidate.findUnique({ where: { id: parsed.data.candidateId } }),
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

    if (!candidate || !phase) {
      return NextResponse.json({ error: "Candidat ou phase introuvable" }, { status: 404 });
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

    let votesCount: number;
    let amountXaf: number;
    let packageId: string;

    if (parsed.data.customVotes) {
      votesCount = parsed.data.customVotes;
      amountXaf = priceForVotes(votesCount);

      const unitPack =
        (await prisma.votePackage.findFirst({
          where: {
            seasonId: candidate.seasonId,
            votesCount: 1,
            isActive: true,
          },
        })) ??
        (await prisma.votePackage.findFirst({
          where: { seasonId: candidate.seasonId, isActive: true },
          orderBy: { sortOrder: "asc" },
        }));

      if (!unitPack) {
        return NextResponse.json(
          { error: "Aucun pack de votes configuré pour la saison" },
          { status: 400 },
        );
      }
      packageId = unitPack.id;
    } else {
      const votePackage = await prisma.votePackage.findUnique({
        where: { id: parsed.data.packageId },
      });
      if (!votePackage || !votePackage.isActive) {
        return NextResponse.json({ error: "Pack introuvable" }, { status: 404 });
      }
      votesCount = votePackage.votesCount;
      amountXaf = votePackage.priceXaf;
      packageId = votePackage.id;
    }

    const reference = `FTC-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const transaction = await prisma.transaction.create({
      data: {
        reference,
        phaseId: phase.id,
        candidateId: candidate.id,
        packageId,
        voterPhone: phone,
        voterName: parsed.data.voterName.trim(),
        operator: parsed.data.operator,
        votesCount,
        amountXaf,
        status: "pending",
      },
    });

    const origin = new URL(request.url).origin;
    const payment = await collectVotePayment({
      amountXaf,
      phone,
      operator: parsed.data.operator,
      reference,
      description: `ForTheCulture ${votesCount} vote(s) pour ${candidate.stageName}`,
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

    const authorizationUrl =
      "authorizationUrl" in payment ? payment.authorizationUrl : null;

    return NextResponse.json({
      ok: true,
      mode: "live",
      reference,
      paymentRef: payment.reference,
      authorizationUrl: authorizationUrl ?? null,
      message: authorizationUrl
        ? "Redirection vers Notch Pay pour valider le Mobile Money."
        : "Valide le paiement sur ton téléphone (Orange Money ou MTN Money).",
      redirect: authorizationUrl || `/vote/succes?ref=${reference}`,
    });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Impossible de lancer le paiement";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
