import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL manquant");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const hash = await bcrypt.hash("jury123", 10);
  const profiles = [
    { email: "jury1@fortheculture.cm", name: "Jury 1" },
    { email: "jury2@fortheculture.cm", name: "Jury 2" },
    { email: "jury3@fortheculture.cm", name: "Jury 3" },
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
