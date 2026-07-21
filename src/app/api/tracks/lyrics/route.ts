import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCandidateSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  phaseId: z.string().min(1),
  title: z.string().trim().max(120).optional(),
  lyrics: z.string().trim().max(12000).nullable().optional(),
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

  const track = await prisma.phaseTrack.findFirst({
    where: {
      phaseId: parsed.data.phaseId,
      candidateId: session.id,
    },
  });
  if (!track) {
    return NextResponse.json(
      { error: "Uploade d'abord un son pour cette phase" },
      { status: 404 },
    );
  }

  const updated = await prisma.phaseTrack.update({
    where: { id: track.id },
    data: {
      title:
        parsed.data.title !== undefined
          ? parsed.data.title || null
          : track.title,
      lyrics:
        parsed.data.lyrics !== undefined
          ? parsed.data.lyrics || null
          : track.lyrics,
    },
  });

  revalidatePath("/candidat");
  revalidatePath(`/candidats/${session.slug}`);

  return NextResponse.json({ ok: true, track: updated });
}
