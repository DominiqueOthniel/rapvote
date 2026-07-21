import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

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

  const updated = await prisma.phaseTrack.update({
    where: { id: track.id },
    data: { playCount: { increment: 1 } },
    select: { playCount: true },
  });

  return NextResponse.json({ ok: true, playCount: updated.playCount });
}
