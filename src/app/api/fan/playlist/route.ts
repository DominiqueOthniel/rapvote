import { NextResponse } from "next/server";
import { z } from "zod";
import { getFanSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFanPlaylist } from "@/lib/fan-engagement";

const schema = z.object({
  trackId: z.string().min(1),
});

function mapPlaylistItem(
  item: Awaited<ReturnType<typeof getFanPlaylist>>[number],
) {
  const t = item.track;
  return {
    id: t.id,
    title: t.title?.trim() || `Son · ${t.candidate.stageName}`,
    audioUrl: t.audioUrl,
    lyrics: t.lyrics,
    playCount: t.playCount,
    likeCount: t._count.likes,
    savedAt: item.createdAt.toISOString(),
    candidateSlug: t.candidate.slug,
    candidateName: t.candidate.stageName,
    candidatePhotoUrl: t.candidate.photoUrl,
  };
}

export async function GET() {
  const fan = await getFanSession();
  if (!fan) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const items = await getFanPlaylist(fan.id);
  return NextResponse.json({
    ok: true,
    items: items.map(mapPlaylistItem),
  });
}

export async function POST(request: Request) {
  const fan = await getFanSession();
  if (!fan) {
    return NextResponse.json(
      { error: "Connecte-toi pour sauvegarder un son" },
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

  await prisma.fanPlaylistItem.upsert({
    where: {
      fanId_trackId: { fanId: fan.id, trackId: track.id },
    },
    create: { fanId: fan.id, trackId: track.id },
    update: {},
  });

  return NextResponse.json({ ok: true, saved: true });
}

export async function DELETE(request: Request) {
  const fan = await getFanSession();
  if (!fan) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Son invalide" }, { status: 400 });
  }

  await prisma.fanPlaylistItem.deleteMany({
    where: { fanId: fan.id, trackId: parsed.data.trackId },
  });

  return NextResponse.json({ ok: true, saved: false });
}
