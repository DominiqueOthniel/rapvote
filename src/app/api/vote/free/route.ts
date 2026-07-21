import { NextResponse } from "next/server";
import { z } from "zod";
import { getFanSession } from "@/lib/auth";
import { redeemFreeVote } from "@/lib/fan-engagement";

const schema = z.object({
  candidateId: z.string().min(1),
  phaseId: z.string().min(1),
});

export async function POST(request: Request) {
  const fan = await getFanSession();
  if (!fan) {
    return NextResponse.json(
      { error: "Connecte-toi pour utiliser ton vote gratuit" },
      { status: 401 },
    );
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  try {
    const result = await redeemFreeVote({
      fanId: fan.id,
      fanName: fan.name,
      fanPhone: fan.phone,
      candidateId: parsed.data.candidateId,
      phaseId: parsed.data.phaseId,
    });
    return NextResponse.json({
      ok: true,
      reference: result.reference,
      engagement: result.engagement,
      message: "1 vote gratuit crédité",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Vote gratuit impossible";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
