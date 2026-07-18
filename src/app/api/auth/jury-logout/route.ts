import { NextResponse } from "next/server";
import { destroyJurySession } from "@/lib/auth";

export async function POST() {
  await destroyJurySession();
  return NextResponse.json({ ok: true });
}
