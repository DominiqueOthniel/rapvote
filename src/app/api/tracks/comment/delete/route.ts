import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAdminSession,
  getCandidateSession,
} from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  commentId: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Commentaire invalide" }, { status: 400 });
  }

  const comment = await prisma.trackComment.findUnique({
    where: { id: parsed.data.commentId },
    include: { track: { select: { candidateId: true } } },
  });
  if (!comment) {
    return NextResponse.json({ error: "Commentaire introuvable" }, { status: 404 });
  }

  const admin = await getAdminSession();
  const candidate = await getCandidateSession();
  const isOwner = candidate?.id === comment.track.candidateId;

  if (!admin && !isOwner) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  await prisma.trackComment.delete({ where: { id: comment.id } });
  return NextResponse.json({ ok: true });
}
