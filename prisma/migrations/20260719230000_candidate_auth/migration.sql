-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Candidate_email_key" ON "Candidate"("email");
