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
  const admin = await prisma.admin.findFirst({
    where: { email: "admin@rapvote.cm" },
  });
  if (admin) {
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        email: "admin@fortheculture.cm",
        name: "Admin ForTheCulture",
      },
    });
    console.log("Admin email mis à jour");
  }

  const map = [
    ["jury1@rapvote.cm", "jury1@fortheculture.cm"],
    ["jury2@rapvote.cm", "jury2@fortheculture.cm"],
    ["jury3@rapvote.cm", "jury3@fortheculture.cm"],
  ] as const;

  for (const [from, to] of map) {
    const jury = await prisma.jury.findUnique({ where: { email: from } });
    if (jury) {
      await prisma.jury.update({
        where: { id: jury.id },
        data: { email: to },
      });
      console.log(`${from} → ${to}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
