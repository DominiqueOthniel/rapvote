import { NextResponse } from "next/server";
import { getFanSession } from "@/lib/auth";
import { getFanEngagement } from "@/lib/fan-engagement";

export async function GET() {
  const fan = await getFanSession();
  if (!fan) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const engagement = await getFanEngagement(fan.id);
  return NextResponse.json({ ok: true, engagement });
}
