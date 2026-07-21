import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/db";

const BUCKET = "candidates";

function safeFilename(title: string | null | undefined) {
  const base = (title ?? "son")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s.-]+/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 80);
  return `${base || "son"}.mp3`;
}

function extractStoragePath(audioUrl: string) {
  const marker = `/object/public/${BUCKET}/`;
  const idx = audioUrl.indexOf(marker);
  if (idx >= 0) {
    return decodeURIComponent(audioUrl.slice(idx + marker.length).split("?")[0]);
  }

  const local = audioUrl.match(/\/uploads\/candidates\/(.+)$/);
  if (local?.[1]) return null;

  return null;
}

function guessContentType(url: string) {
  const lower = url.toLowerCase();
  if (lower.includes(".m4a") || lower.includes("audio/mp4")) return "audio/mp4";
  if (lower.includes(".wav")) return "audio/wav";
  if (lower.includes(".ogg")) return "audio/ogg";
  if (lower.includes(".webm")) return "audio/webm";
  return "audio/mpeg";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const trackId = url.searchParams.get("trackId")?.trim();
  const countOnly = url.searchParams.get("countOnly") === "1";
  if (!trackId) {
    return NextResponse.json({ error: "Son invalide" }, { status: 400 });
  }

  const track = await prisma.phaseTrack.findUnique({
    where: { id: trackId },
    select: { id: true, audioUrl: true, title: true },
  });
  if (!track) {
    return NextResponse.json({ error: "Son introuvable" }, { status: 404 });
  }

  const updated = await prisma.phaseTrack.update({
    where: { id: track.id },
    data: { downloadCount: { increment: 1 } },
    select: { downloadCount: true },
  });

  if (countOnly) {
    return NextResponse.json({
      ok: true,
      downloadCount: updated.downloadCount,
    });
  }

  const filename = safeFilename(track.title);
  const storagePath = extractStoragePath(track.audioUrl);
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  // Préférer une URL signée Supabase qui force le download (pas de CORS).
  if (storagePath && supabaseUrl && serviceKey) {
    const client = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 120, { download: filename });

    if (!error && data?.signedUrl) {
      return NextResponse.redirect(data.signedUrl, 302);
    }
  }

  // Fallback: proxy le fichier (local ou si signed URL indisponible).
  let upstream: Response;
  try {
    upstream = await fetch(track.audioUrl, { cache: "no-store" });
  } catch {
    return NextResponse.json(
      { error: "Impossible de récupérer le fichier audio" },
      { status: 502 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: "Fichier audio indisponible" },
      { status: 502 },
    );
  }

  const contentType =
    upstream.headers.get("content-type") || guessContentType(track.audioUrl);

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
