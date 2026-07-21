import { NextResponse } from "next/server";
import { z } from "zod";
import { getFanSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recordCountedListen } from "@/lib/fan-engagement";

const schema = z.object({
  trackId: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Son invalide" }, { status: 400 });
  }

  const track = await prisma.phaseTrack.findUnique({
    where: { id: parsed.data.trackId },
    select: { id: true },
  });
  if (!track) {
    return NextResponse.json({ error: "Son introuvable" }, { status: 404 });
  }

  const fan = await getFanSession();

  const updated = await prisma.phaseTrack.update({
    where: { id: track.id },
    data: { playCount: { increment: 1 } },
    select: { playCount: true },
  });

  const engagement = await recordCountedListen({
    trackId: track.id,
    fanId: fan?.id ?? null,
  });

  return NextResponse.json({
    ok: true,
    playCount: updated.playCount,
    engagement,
  });
}
