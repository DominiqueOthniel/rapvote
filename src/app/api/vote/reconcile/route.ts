import { NextResponse } from "next/server";
import { reconcilePendingVotes } from "@/lib/reconcile-votes";

export const dynamic = "force-dynamic";

/**
 * Resynchronise les votes pending avec Notch.
 * Auth: AUTH_SECRET (header x-reconcile-secret) OU CRON_SECRET.
 */
export async function POST(request: Request) {
  const secret = process.env.AUTH_SECRET?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();
  const provided =
    request.headers.get("x-reconcile-secret") ??
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  const authorized =
    (secret && provided === secret) ||
    (cronSecret && provided === cronSecret);

  if (!authorized) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const report = await reconcilePendingVotes(50);
  return NextResponse.json({ ok: true, ...report });
}

export async function GET(request: Request) {
  return POST(request);
}
