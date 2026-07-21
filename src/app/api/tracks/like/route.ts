import { NextResponse } from "next/server";
import { z } from "zod";
import { getFanSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  trackId: z.string().min(1),
});

export async function POST(request: Request) {
  const fan = await getFanSession();
  if (!fan) {
    return NextResponse.json(
      { error: "Connecte-toi pour liker un son" },
      { status: 401 },
    );
  }

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

  const existing = await prisma.trackLike.findUnique({
    where: {
      trackId_fanId: {
        trackId: track.id,
        fanId: fan.id,
      },
    },
  });

  if (existing) {
    await prisma.trackLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.trackLike.create({
      data: {
        trackId: track.id,
        fanId: fan.id,
      },
    });
  }

  const likeCount = await prisma.trackLike.count({
    where: { trackId: track.id },
  });

  return NextResponse.json({
    ok: true,
    liked: !existing,
    likeCount,
  });
}
