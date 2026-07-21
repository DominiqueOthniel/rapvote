import { NextResponse } from "next/server";
import { z } from "zod";
import { getFanSession } from "@/lib/auth";
import {
  createCandidateNotification,
  trackLabel,
} from "@/lib/candidate-notifications";
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
    select: { id: true, candidateId: true, title: true },
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
    await createCandidateNotification({
      candidateId: track.candidateId,
      type: "like",
      trackId: track.id,
      fanId: fan.id,
      title: `${fan.name} a liké ${trackLabel(track.title)}`,
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
