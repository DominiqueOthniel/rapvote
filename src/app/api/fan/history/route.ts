import { NextResponse } from "next/server";
import { getFanSession } from "@/lib/auth";
import { getFanListenHistory } from "@/lib/fan-engagement";

export async function GET() {
  const fan = await getFanSession();
  if (!fan) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const items = await getFanListenHistory(fan.id);
  return NextResponse.json({
    ok: true,
    items: items.map((item) => {
      const t = item.track;
      return {
        id: t.id,
        title: t.title?.trim() || `Son · ${t.candidate.stageName}`,
        audioUrl: t.audioUrl,
        lyrics: t.lyrics,
        playCount: t.playCount,
        likeCount: t._count.likes,
        listenedAt: item.listenedAt.toISOString(),
        candidateSlug: t.candidate.slug,
        candidateName: t.candidate.stageName,
        candidatePhotoUrl: t.candidate.photoUrl,
      };
    }),
  });
}
