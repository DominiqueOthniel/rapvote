import "dotenv/config";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import { EPISODES } from "../src/lib/parcours";

const dbPath = path.join(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

const candidates = [
  {
    stageName: "Benda Fire",
    city: "Douala",
    bio: "Flow agressif et punchlines brûlantes. Enfant de Douala, il transforme la rue en ring à chaque couplet.",
    photoUrl: "/artists/benda-fire.png",
  },
  {
    stageName: "Nja Street",
    city: "Yaoundé",
    bio: "Storytelling conscient et images fortes. Yaoundé dans la voix, la vérité dans les bars.",
    photoUrl: "/artists/nja-street.png",
  },
  {
    stageName: "Kala King",
    city: "Bafoussam",
    bio: "Mélodies lourdes, hooks qui restent. Le roi de l'ouest impose son groove sans forcer.",
    photoUrl: "/artists/kala-king.png",
  },
  {
    stageName: "Sango Lex",
    city: "Garoua",
    bio: "Technique pure, battles et freestyles. Un cerveau rapide, une diction chirurgicale.",
    photoUrl: "/artists/sango-lex.png",
  },
  {
    stageName: "Mboa Queen",
    city: "Douala",
    bio: "Rap féminin tranchant et présence scénique. Elle prend le mic comme on prend le pouvoir.",
    photoUrl: "/artists/mboa-queen.png",
  },
  {
    stageName: "Cipher Joe",
    city: "Yaoundé",
    bio: "Cyphers, speed rap et énergie live. Quand Joe arrive, le cercle devient une arène.",
    photoUrl: "/artists/cipher-joe.png",
  },
];

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  await prisma.vote.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.juryScore.deleteMany();
  await prisma.phaseEntry.deleteMany();
  await prisma.votePackage.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.phase.deleteMany();
  await prisma.season.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.jury.deleteMany();

  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.admin.create({
    data: {
      email: "admin@rapvote.cm",
      name: "Admin RapVote",
      passwordHash,
    },
  });

  const juryPassword = await bcrypt.hash("jury123", 10);
  const juryProfiles = [
    { email: "jury1@rapvote.cm", name: "Jury 1" },
    { email: "jury2@rapvote.cm", name: "Jury 2" },
    { email: "jury3@rapvote.cm", name: "Jury 3" },
  ];
  for (const profile of juryProfiles) {
    await prisma.jury.create({
      data: {
        email: profile.email,
        name: profile.name,
        passwordHash: juryPassword,
      },
    });
  }

  const season = await prisma.season.create({
    data: {
      title: "N£₩ St@r ₽uN€h · Saison 1",
      tagline:
        "Du freestyle à l'œuvre ultime. Jury, public, et un seul champion.",
      isActive: true,
      packages: {
        create: [
          { label: "1 vote", votesCount: 1, priceXaf: 100, sortOrder: 1 },
          { label: "5 votes", votesCount: 5, priceXaf: 450, sortOrder: 2 },
          { label: "10 votes", votesCount: 10, priceXaf: 800, sortOrder: 3 },
          { label: "50 votes", votesCount: 50, priceXaf: 3500, sortOrder: 4 },
        ],
      },
      phases: {
        create: EPISODES.map((episode) => ({
          number: episode.number,
          title: episode.title,
          theme: episode.title,
          status: episode.number === 0 ? "active" : "upcoming",
        })),
      },
    },
    include: { phases: true },
  });

  const createdCandidates = [];
  for (const c of candidates) {
    const candidate = await prisma.candidate.create({
      data: {
        seasonId: season.id,
        stageName: c.stageName,
        slug: slugify(c.stageName),
        city: c.city,
        bio: c.bio,
        photoUrl: c.photoUrl,
      },
    });
    createdCandidates.push(candidate);
  }

  const phase0 = season.phases.find((p) => p.number === 0)!;
  for (const candidate of createdCandidates) {
    await prisma.phaseEntry.create({
      data: {
        phaseId: phase0.id,
        candidateId: candidate.id,
        status: "active",
      },
    });
  }

  console.log("Seed OK");
  console.log("Admin: admin@rapvote.cm / admin123");
  console.log("Jury: jury1@rapvote.cm · jury2@rapvote.cm · jury3@rapvote.cm / jury123");
  console.log(`Saison: ${season.title}`);
  console.log(`Candidats: ${createdCandidates.length}`);
  console.log(`Épisodes: ${EPISODES.length}`);
  console.log("Épisode 0 actif");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
