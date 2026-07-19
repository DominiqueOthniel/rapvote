import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Connexion directe pour migrate / db push (port 5432)
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
