import { NextResponse } from "next/server";
import { getCandidateSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const candidate = await getCandidateSession();
  if (!candidate) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const [items, unreadCount] = await Promise.all([
    prisma.candidateNotification.findMany({
      where: { candidateId: candidate.id },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.candidateNotification.count({
      where: { candidateId: candidate.id, readAt: null },
    }),
  ]);

  return NextResponse.json({ ok: true, items, unreadCount });
}
