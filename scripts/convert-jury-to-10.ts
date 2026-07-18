import "dotenv/config";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const dbPath = path.join(process.cwd(), "dev.db");
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: `file:${dbPath}` }),
});

async function main() {
  const scores = await prisma.juryScore.findMany();
  for (const row of scores) {
    if (row.score > 10) {
      const next = Math.min(10, Math.max(0, Math.round(row.score / 10)));
      await prisma.juryScore.update({
        where: { id: row.id },
        data: { score: next },
      });
      console.log(`JuryScore ${row.id}: ${row.score} → ${next}`);
    }
  }

  const entries = await prisma.phaseEntry.findMany({
    include: { juryScores: true },
  });
  for (const entry of entries) {
    if (entry.juryScores.length === 0) {
      if (entry.juryScore > 10) {
        const next = Math.min(10, Math.max(0, Math.round(entry.juryScore / 10)));
        await prisma.phaseEntry.update({
          where: { id: entry.id },
          data: { juryScore: next },
        });
        console.log(`PhaseEntry ${entry.id}: ${entry.juryScore} → ${next}`);
      }
      continue;
    }
    const sum = entry.juryScores.reduce((total, item) => {
      const score = item.score > 10 ? Math.round(item.score / 10) : item.score;
      return total + score;
    }, 0);
    const average = Math.round(sum / entry.juryScores.length);
    if (entry.juryScore !== average) {
      await prisma.phaseEntry.update({
        where: { id: entry.id },
        data: { juryScore: average },
      });
      console.log(`PhaseEntry ${entry.id} moyenne → ${average}`);
    }
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
