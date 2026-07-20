import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasUrl = Boolean(process.env.DATABASE_URL?.trim());
  const url = process.env.DATABASE_URL ?? "";
  let host = "missing";
  let port = "missing";
  let user = "missing";

  try {
    const parsed = new URL(url);
    host = parsed.hostname;
    port = parsed.port || "5432";
    user = parsed.username;
  } catch {
    host = "invalid-url";
  }

  if (!hasUrl) {
    return NextResponse.json({
      ok: false,
      step: "env",
      message: "DATABASE_URL manquant sur Netlify",
    });
  }

  try {
    await prisma.$queryRaw`SELECT 1 as ok`;
    const season = await prisma.season.count();
    return NextResponse.json({
      ok: true,
      host,
      port,
      user,
      seasons: season,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({
      ok: false,
      step: "query",
      host,
      port,
      user,
      message,
    });
  }
}
