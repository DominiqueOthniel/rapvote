import { NextResponse } from "next/server";
import { destroyFanSession } from "@/lib/auth";

export async function POST() {
  await destroyFanSession();
  return NextResponse.json({ ok: true });
}
