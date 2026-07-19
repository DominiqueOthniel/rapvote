import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  JURY_COOKIE,
  createJuryToken,
  getSessionCookieOptions,
  verifyPassword,
} from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 400 });
    }

    if (!process.env.AUTH_SECRET) {
      return NextResponse.json(
        { error: "AUTH_SECRET manquant sur Netlify" },
        { status: 500 },
      );
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "DATABASE_URL manquant sur Netlify" },
        { status: 500 },
      );
    }

    const jury = await prisma.jury.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    });

    if (!jury || !(await verifyPassword(parsed.data.password, jury.passwordHash))) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 },
      );
    }

    const token = await createJuryToken(jury.id);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(JURY_COOKIE, token, getSessionCookieOptions());
    return response;
  } catch (error) {
    console.error("jury login failed", error);
    const message =
      error instanceof Error ? error.message : "Connexion impossible";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
