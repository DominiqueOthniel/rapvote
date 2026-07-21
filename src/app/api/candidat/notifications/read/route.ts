import { NextResponse } from "next/server";
import { z } from "zod";
import { getCandidateSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  id: z.string().min(1).optional(),
  all: z.boolean().optional(),
});

export async function POST(request: Request) {
  const candidate = await getCandidateSession();
  if (!candidate) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const now = new Date();

  if (parsed.data.all) {
    await prisma.candidateNotification.updateMany({
      where: { candidateId: candidate.id, readAt: null },
      data: { readAt: now },
    });
  } else if (parsed.data.id) {
    await prisma.candidateNotification.updateMany({
      where: {
        id: parsed.data.id,
        candidateId: candidate.id,
        readAt: null,
      },
      data: { readAt: now },
    });
  } else {
    return NextResponse.json(
      { error: "Indique une notif ou tout lire" },
      { status: 400 },
    );
  }

  const unreadCount = await prisma.candidateNotification.count({
    where: { candidateId: candidate.id, readAt: null },
  });

  return NextResponse.json({ ok: true, unreadCount });
}
