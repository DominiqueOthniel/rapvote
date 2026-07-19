import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL manquant");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
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
