-- CreateTable
CREATE TABLE IF NOT EXISTS "Payout" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "amountXaf" INTEGER NOT NULL,
    "phone" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "notchId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "description" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Payout_reference_key" ON "Payout"("reference");
CREATE INDEX IF NOT EXISTS "Payout_candidateId_idx" ON "Payout"("candidateId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Payout_candidateId_fkey'
  ) THEN
    ALTER TABLE "Payout"
      ADD CONSTRAINT "Payout_candidateId_fkey"
      FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
