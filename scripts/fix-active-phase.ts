import "dotenv/config";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: `file:${path.join(process.cwd(), "dev.db")}`,
  }),
});

async function main() {
  const season = await prisma.season.findFirst({ where: { isActive: true } });
  if (!season) throw new Error("no season");

  await prisma.phase.updateMany({
    where: { seasonId: season.id, status: "active" },
    data: { status: "upcoming" },
  });
  await prisma.phase.update({
    where: { seasonId_number: { seasonId: season.id, number: 0 } },
    data: { status: "active" },
  });
  console.log("Only episode 0 active");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
