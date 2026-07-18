import "dotenv/config";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const dbPath = path.join(process.cwd(), "dev.db");
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: `file:${dbPath}` }),
});

async function main() {
  const hash = await bcrypt.hash("jury123", 10);
  const profiles = [
    { email: "jury1@rapvote.cm", name: "Jury 1" },
    { email: "jury2@rapvote.cm", name: "Jury 2" },
    { email: "jury3@rapvote.cm", name: "Jury 3" },
  ];

  for (const profile of profiles) {
    await prisma.jury.upsert({
      where: { email: profile.email },
      create: {
        email: profile.email,
        name: profile.name,
        passwordHash: hash,
      },
      update: {
        name: profile.name,
        passwordHash: hash,
      },
    });
    console.log("OK", profile.email);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
