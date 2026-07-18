import "dotenv/config";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { EPISODES } from "../src/lib/parcours";

const dbPath = path.join(process.cwd(), "dev.db");
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: `file:${dbPath}` }),
});

async function main() {
  const season = await prisma.season.findFirst({
    where: { isActive: true },
    include: { phases: true, candidates: true },
  });

  if (!season) {
    throw new Error("Aucune saison active. Lance d'abord le seed.");
  }

  await prisma.season.update({
    where: { id: season.id },
    data: {
      title: "N£₩ St@r ₽uN€h · Saison 1",
      tagline:
        "Du freestyle à l'œuvre ultime. Jury, public, et un seul champion.",
    },
  });

  const keepNumbers = new Set(EPISODES.map((e) => e.number));
  const obsolete = season.phases.filter((p) => !keepNumbers.has(p.number));

  for (const phase of obsolete) {
    await prisma.phaseEntry.deleteMany({ where: { phaseId: phase.id } });
    await prisma.vote.deleteMany({ where: { phaseId: phase.id } });
    await prisma.transaction.deleteMany({ where: { phaseId: phase.id } });
    await prisma.phase.delete({ where: { id: phase.id } });
    console.log(`Phase ${phase.number} supprimée`);
  }

  const existingActive = season.phases.filter((p) => p.status === "active");
  const preferredActive =
    existingActive.find((p) => keepNumbers.has(p.number))?.number ?? 0;

  for (const episode of EPISODES) {
    const existing = await prisma.phase.findUnique({
      where: {
        seasonId_number: {
          seasonId: season.id,
          number: episode.number,
        },
      },
    });

    let status = "upcoming";
    if (episode.number === preferredActive) {
      status = "active";
    } else if (existing?.status === "closed") {
      status = "closed";
    }

    await prisma.phase.upsert({
      where: {
        seasonId_number: {
          seasonId: season.id,
          number: episode.number,
        },
      },
      create: {
        seasonId: season.id,
        number: episode.number,
        title: episode.title,
        theme: episode.title,
        status: episode.number === preferredActive ? "active" : "upcoming",
      },
      update: {
        title: episode.title,
        theme: episode.title,
        status,
      },
    });

    console.log(`OK ${episode.code} · ${episode.title} (${status})`);
  }

  await prisma.phase.updateMany({
    where: {
      seasonId: season.id,
      number: { not: preferredActive },
      status: "active",
    },
    data: { status: "upcoming" },
  });

  const phaseActive = await prisma.phase.findUnique({
    where: {
      seasonId_number: { seasonId: season.id, number: preferredActive },
    },
  });

  if (phaseActive) {
    for (const candidate of season.candidates) {
      await prisma.phaseEntry.upsert({
        where: {
          phaseId_candidateId: {
            phaseId: phaseActive.id,
            candidateId: candidate.id,
          },
        },
        create: {
          phaseId: phaseActive.id,
          candidateId: candidate.id,
          status: "active",
        },
        update: {},
      });
    }
  }

  console.log(`Parcours synchronisé · ${EPISODES.length} étapes · active=${preferredActive}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
