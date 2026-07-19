import path from "node:path";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const tursoUrl = process.env.TURSO_DATABASE_URL ?? process.env.LIBSQL_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN ?? process.env.LIBSQL_DATABASE_TOKEN;

  // Netlify / serverless: pas de SQLite fichier local.
  if (tursoUrl && (tursoUrl.startsWith("libsql://") || tursoUrl.startsWith("https://"))) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaLibSQL } = require("@prisma/adapter-libsql") as typeof import("@prisma/adapter-libsql");
    return new PrismaClient({
      adapter: new PrismaLibSQL({
        url: tursoUrl,
        authToken: tursoToken,
      }),
    });
  }

  const onNetlify = process.env.NETLIFY === "true" || Boolean(process.env.CONTEXT);
  if (onNetlify) {
    throw new Error(
      "TURSO_DATABASE_URL et TURSO_AUTH_TOKEN sont requis sur Netlify (SQLite local impossible).",
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3") as typeof import("@prisma/adapter-better-sqlite3");
  const raw = process.env.DATABASE_URL ?? "file:./dev.db";
  const relative = raw.replace(/^file:/, "");
  const url = path.isAbsolute(relative)
    ? raw
    : `file:${path.join(process.cwd(), relative)}`;

  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
