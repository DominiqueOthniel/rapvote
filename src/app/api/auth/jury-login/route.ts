import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createJurySession, verifyPassword } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Identifiants invalides" }, { status: 400 });
  }

  const jury = await prisma.jury.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  if (!jury || !(await verifyPassword(parsed.data.password, jury.passwordHash))) {
    return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });
  }

  await createJurySession(jury.id);
  return NextResponse.json({ ok: true });
}
