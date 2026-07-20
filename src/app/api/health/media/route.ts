import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isSupabaseStorageConfigured } from "@/lib/upload";

export const dynamic = "force-dynamic";

export async function GET() {
  let fanOk = false;
  let trackOk = false;
  let fanError: string | null = null;
  let trackError: string | null = null;

  try {
    await prisma.fan.count();
    fanOk = true;
  } catch (error) {
    fanError = error instanceof Error ? error.message : String(error);
  }

  try {
    await prisma.phaseTrack.count();
    trackOk = true;
  } catch (error) {
    trackError = error instanceof Error ? error.message : String(error);
  }

  const supabase = isSupabaseStorageConfigured();

  return NextResponse.json({
    ok: fanOk && trackOk && supabase,
    fanTable: fanOk,
    trackTable: trackOk,
    supabaseConfigured: supabase,
    fanError,
    trackError,
    hint: !supabase
      ? "Ajoute SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sur Netlify pour les sons."
      : !fanOk || !trackOk
        ? "Tables Fan/PhaseTrack manquantes: lance npm run db:migrate"
        : "Upload sons + commentaires prêts.",
  });
}
