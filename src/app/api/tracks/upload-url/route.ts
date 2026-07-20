import { NextResponse } from "next/server";
import { z } from "zod";
import { getCandidateSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createPhaseAudioUploadTarget,
  isAllowedAudioType,
  isSupabaseStorageConfigured,
  PHASE_AUDIO_MAX_BYTES,
} from "@/lib/upload";

const schema = z.object({
  phaseId: z.string().min(1),
  contentType: z.string().min(3),
  size: z.number().int().positive(),
});

export async function POST(request: Request) {
  const session = await getCandidateSession();
  if (!session) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  if (!isSupabaseStorageConfigured()) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY manquants sur Netlify",
      },
      { status: 503 },
    );
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  if (!isAllowedAudioType(parsed.data.contentType)) {
    return NextResponse.json(
      { error: "Format audio invalide (MP3, M4A, WAV, WebM ou OGG)" },
      { status: 400 },
    );
  }

  if (parsed.data.size > PHASE_AUDIO_MAX_BYTES) {
    return NextResponse.json(
      { error: "Son trop lourd (max 15 Mo)" },
      { status: 400 },
    );
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

  try {
    const target = await createPhaseAudioUploadTarget(
      candidate.slug,
      phase.number,
      parsed.data.contentType,
    );
    return NextResponse.json({
      ok: true,
      ...target,
      phaseId: phase.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Impossible de préparer l'upload",
      },
      { status: 500 },
    );
  }
}
