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
  body: z.string().trim().min(2).max(500),
});

export async function GET(request: Request) {
  const trackId = new URL(request.url).searchParams.get("trackId")?.trim();
  if (!trackId) {
    return NextResponse.json({ error: "Son invalide" }, { status: 400 });
  }

  const track = await prisma.phaseTrack.findUnique({
    where: { id: trackId },
    select: { id: true },
  });
  if (!track) {
    return NextResponse.json({ error: "Son introuvable" }, { status: 404 });
  }

  const fan = await getFanSession();
  const comments = await prisma.trackComment.findMany({
    where: { trackId },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      fan: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    fan: fan ? { id: fan.id, name: fan.name } : null,
    comments: comments.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      likedByArtist: c.likedByArtist,
      fan: c.fan,
    })),
  });
}

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
    select: { id: true, candidateId: true, title: true },
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

  const snippet =
    comment.body.length > 120
      ? `${comment.body.slice(0, 117)}…`
      : comment.body;

  await createCandidateNotification({
    candidateId: track.candidateId,
    type: "comment",
    trackId: track.id,
    fanId: fan.id,
    commentId: comment.id,
    title: `${fan.name} a commenté ${trackLabel(track.title)}`,
    body: snippet,
  });

  return NextResponse.json({ ok: true, comment });
}
