import { NextResponse } from "next/server";
import { z } from "zod";
import { getCandidateSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  commentId: z.string().min(1),
});

export async function POST(request: Request) {
  const candidate = await getCandidateSession();
  if (!candidate) {
    return NextResponse.json(
      { error: "Connecte-toi en tant que candidat" },
      { status: 401 },
    );
  }

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

  if (comment.track.candidateId !== candidate.id) {
    return NextResponse.json(
      { error: "Tu ne peux liker que les commentaires sur tes sons" },
      { status: 403 },
    );
  }

  const updated = await prisma.trackComment.update({
    where: { id: comment.id },
    data: { likedByArtist: !comment.likedByArtist },
    select: { id: true, likedByArtist: true },
  });

  return NextResponse.json({ ok: true, likedByArtist: updated.likedByArtist });
}
