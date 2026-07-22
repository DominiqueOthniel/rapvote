import { NextResponse } from "next/server";
import { getTodayStreamerBoard } from "@/lib/fan-engagement";

export async function GET() {
  const board = await getTodayStreamerBoard(3);
  return NextResponse.json(board);
}
