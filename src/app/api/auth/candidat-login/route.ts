import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  CANDIDATE_COOKIE,
  createCandidateToken,
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
        { error: "AUTH_SECRET manquant sur le serveur" },
        { status: 500 },
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    const candidate = await prisma.candidate.findUnique({ where: { email } });

    if (
      !candidate?.passwordHash ||
      !(await verifyPassword(parsed.data.password, candidate.passwordHash))
    ) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 },
      );
    }

    const token = await createCandidateToken(candidate.id);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(CANDIDATE_COOKIE, token, getSessionCookieOptions());
    return response;
  } catch (error) {
    console.error("candidate login failed", error);
    const message =
      error instanceof Error ? error.message : "Connexion impossible";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
