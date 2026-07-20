import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import pg from "pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function prepareDatabaseUrl(raw: string) {
  const url = new URL(raw);

  // Pooler transaction (6543) : Prisma a besoin de pgbouncer=true
  if (url.port === "6543" && !url.searchParams.has("pgbouncer")) {
    url.searchParams.set("pgbouncer", "true");
  }

  if (!url.searchParams.has("sslmode")) {
    url.searchParams.set("sslmode", "require");
  }

  // Limite les connexions sur serverless Netlify
  if (!url.searchParams.has("connection_limit")) {
    url.searchParams.set("connection_limit", "1");
  }

  return url.toString();
}

function createPrismaClient() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error(
      "DATABASE_URL manquant. Ajoute l'URL Postgres Supabase (pooler) dans les variables Netlify.",
    );
  }

  const connectionString = prepareDatabaseUrl(raw);
  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

// Init paresseux: le build Netlify peut importer les modules sans DATABASE_URL.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client as object, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
