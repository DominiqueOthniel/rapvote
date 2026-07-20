import { NextResponse } from "next/server";
import { z } from "zod";
import { getFanSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  trackId: z.string().min(1),
  body: z.string().trim().min(2).max(500),
});

export async function POST(request: Request) {
  const fan = await getFanSession();
  if (!fan) {
    return NextResponse.json(
      { error: "Connecte-toi pour commenter" },
      { status: 401 },
    );
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Commentaire invalide (2 à 500 caractères)" },
      { status: 400 },
    );
  }

  const track = await prisma.phaseTrack.findUnique({
    where: { id: parsed.data.trackId },
  });
  if (!track) {
    return NextResponse.json({ error: "Son introuvable" }, { status: 404 });
  }

  const recent = await prisma.trackComment.findFirst({
    where: {
      fanId: fan.id,
      trackId: track.id,
      createdAt: { gte: new Date(Date.now() - 10_000) },
    },
  });
  if (recent) {
    return NextResponse.json(
      { error: "Attends quelques secondes avant un autre commentaire" },
      { status: 429 },
    );
  }

  const comment = await prisma.trackComment.create({
    data: {
      trackId: track.id,
      fanId: fan.id,
      body: parsed.data.body,
    },
    include: { fan: { select: { name: true } } },
  });

  return NextResponse.json({ ok: true, comment });
}
