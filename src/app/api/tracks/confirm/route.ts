import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCandidateSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deletePhaseAudioFile } from "@/lib/upload";

const schema = z.object({
  phaseId: z.string().min(1),
  publicUrl: z.string().url(),
  title: z.string().trim().max(120).optional(),
  lyrics: z.string().trim().max(12000).optional(),
});

export async function POST(request: Request) {
  const session = await getCandidateSession();
  if (!session) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  if (!parsed.data.publicUrl.includes("/storage/v1/object/public/candidates/")) {
    return NextResponse.json({ error: "URL audio invalide" }, { status: 400 });
  }

  const candidate = await prisma.candidate.findUnique({
    where: { id: session.id },
  });
  if (!candidate) {
    return NextResponse.json({ error: "Candidat introuvable" }, { status: 404 });
  }

  const phase = await prisma.phase.findFirst({
    where: { id: parsed.data.phaseId, seasonId: candidate.seasonId },
  });
  if (!phase) {
    return NextResponse.json({ error: "Phase introuvable" }, { status: 404 });
  }

  const existing = await prisma.phaseTrack.findUnique({
    where: {
      candidateId_phaseId: {
        candidateId: candidate.id,
        phaseId: phase.id,
      },
    },
  });

  if (existing) {
    await deletePhaseAudioFile(existing.audioUrl);
    await prisma.phaseTrack.update({
      where: { id: existing.id },
      data: {
        audioUrl: parsed.data.publicUrl,
        title: parsed.data.title || existing.title,
        lyrics:
          parsed.data.lyrics !== undefined
            ? parsed.data.lyrics || null
            : existing.lyrics,
      },
    });
  } else {
    await prisma.phaseTrack.create({
      data: {
        candidateId: candidate.id,
        phaseId: phase.id,
        audioUrl: parsed.data.publicUrl,
        title: parsed.data.title || null,
        lyrics: parsed.data.lyrics || null,
      },
    });
  }

  revalidatePath("/candidat");
  revalidatePath(`/candidats/${candidate.slug}`);

  return NextResponse.json({ ok: true });
}
