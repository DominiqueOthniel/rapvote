import { NextResponse } from "next/server";
import { getTodayBuzz } from "@/lib/fan-engagement";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phaseId = searchParams.get("phaseId");
  const trackIdsRaw = searchParams.get("trackIds");
  const trackIds = trackIdsRaw
    ? trackIdsRaw.split(",").map((id) => id.trim()).filter(Boolean)
    : undefined;

  const buzz = await getTodayBuzz({
    phaseId: phaseId || null,
    trackIds,
  });

  return NextResponse.json({ ok: true, ...buzz });
}
