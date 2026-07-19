import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const ADMIN_COOKIE = "fortheculture_admin";
export const JURY_COOKIE = "fortheculture_jury";
export const CANDIDATE_COOKIE = "fortheculture_candidat";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET manquant sur le serveur");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createAdminToken(adminId: string) {
  return new SignJWT({ sub: adminId, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function createJuryToken(juryId: string) {
  return new SignJWT({ sub: juryId, role: "jury" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export function getSessionCookieOptions() {
  return cookieOptions;
}

export async function createAdminSession(adminId: string) {
  const token = await createAdminToken(adminId);
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, cookieOptions);
}

export async function destroyAdminSession() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}

export async function getAdminSession() {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.role !== "admin") return null;
    const adminId = payload.sub;
    if (!adminId) return null;
    return prisma.admin.findUnique({ where: { id: adminId } });
  } catch {
    return null;
  }
}

export async function requireAdmin() {
  const admin = await getAdminSession();
  if (!admin) throw new Error("UNAUTHORIZED");
  return admin;
}

export async function createJurySession(juryId: string) {
  const token = await createJuryToken(juryId);
  const jar = await cookies();
  jar.set(JURY_COOKIE, token, cookieOptions);
}

export async function destroyJurySession() {
  const jar = await cookies();
  jar.delete(JURY_COOKIE);
}

export async function getJurySession() {
  const jar = await cookies();
  const token = jar.get(JURY_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.role !== "jury") return null;
    const juryId = payload.sub;
    if (!juryId) return null;
    return prisma.jury.findUnique({ where: { id: juryId } });
  } catch {
    return null;
  }
}

export async function requireJury() {
  const jury = await getJurySession();
  if (!jury) throw new Error("UNAUTHORIZED");
  return jury;
}

export async function createCandidateToken(candidateId: string) {
  return new SignJWT({ sub: candidateId, role: "candidate" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function createCandidateSession(candidateId: string) {
  const token = await createCandidateToken(candidateId);
  const jar = await cookies();
  jar.set(CANDIDATE_COOKIE, token, cookieOptions);
}

export async function destroyCandidateSession() {
  const jar = await cookies();
  jar.delete(CANDIDATE_COOKIE);
}

export async function getCandidateSession() {
  const jar = await cookies();
  const token = jar.get(CANDIDATE_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.role !== "candidate") return null;
    const candidateId = payload.sub;
    if (!candidateId) return null;
    return prisma.candidate.findUnique({ where: { id: candidateId } });
  } catch {
    return null;
  }
}

export async function requireCandidate() {
  const candidate = await getCandidateSession();
  if (!candidate) throw new Error("UNAUTHORIZED");
  return candidate;
}
