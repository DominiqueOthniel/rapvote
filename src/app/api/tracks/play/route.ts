import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAdminSession,
  getCandidateSession,
  getFanSession,
  getJurySession,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recordCountedListen } from "@/lib/fan-engagement";
import { getTrackListenState, type ListenRole } from "@/lib/submission-deadline";

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
    select: {
      id: true,
      candidateId: true,
      phase: { select: { submissionDeadlineAt: true } },
    },
  });
  if (!track) {
    return NextResponse.json({ error: "Son introuvable" }, { status: 404 });
  }

  const [fan, jury, admin, candidate] = await Promise.all([
    getFanSession(),
    getJurySession(),
    getAdminSession(),
    getCandidateSession(),
  ]);

  let role: ListenRole = "public";
  if (admin) role = "admin";
  else if (candidate?.id === track.candidateId) role = "owner";
  else if (jury) role = "jury";

  const listen = getTrackListenState({
    deadline: track.phase.submissionDeadlineAt,
    role,
  });
  if (!listen.canListen) {
    return NextResponse.json(
      { error: listen.message ?? "Son verrouillé jusqu'au délai" },
      { status: 403 },
    );
  }

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
