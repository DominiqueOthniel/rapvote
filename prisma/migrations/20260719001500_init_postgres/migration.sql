-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tagline" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Phase" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "theme" TEXT,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Phase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "stageName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "city" TEXT,
    "bio" TEXT,
    "photoUrl" TEXT,
    "audioUrl" TEXT,
    "phoneOrange" TEXT,
    "phoneMtn" TEXT,
    "totalVotes" INTEGER NOT NULL DEFAULT 0,
    "totalEarnedXaf" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhaseEntry" (
    "id" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "votesCount" INTEGER NOT NULL DEFAULT 0,
    "juryScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhaseEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jury" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Jury_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JuryScore" (
    "id" TEXT NOT NULL,
    "juryId" TEXT NOT NULL,
    "phaseEntryId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JuryScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VotePackage" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "votesCount" INTEGER NOT NULL,
    "priceXaf" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VotePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "seasonId" TEXT,
    "phaseId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "voterPhone" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "votesCount" INTEGER NOT NULL,
    "amountXaf" INTEGER NOT NULL,
    "candidateShareXaf" INTEGER NOT NULL DEFAULT 0,
    "adminShareXaf" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "campayRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "votesCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Phase_seasonId_number_key" ON "Phase"("seasonId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_slug_key" ON "Candidate"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PhaseEntry_phaseId_candidateId_key" ON "PhaseEntry"("phaseId", "candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "Jury_email_key" ON "Jury"("email");

-- CreateIndex
CREATE UNIQUE INDEX "JuryScore_juryId_phaseEntryId_key" ON "JuryScore"("juryId", "phaseEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_reference_key" ON "Transaction"("reference");

-- AddForeignKey
ALTER TABLE "Phase" ADD CONSTRAINT "Phase_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhaseEntry" ADD CONSTRAINT "PhaseEntry_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhaseEntry" ADD CONSTRAINT "PhaseEntry_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JuryScore" ADD CONSTRAINT "JuryScore_juryId_fkey" FOREIGN KEY ("juryId") REFERENCES "Jury"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JuryScore" ADD CONSTRAINT "JuryScore_phaseEntryId_fkey" FOREIGN KEY ("phaseEntryId") REFERENCES "PhaseEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotePackage" ADD CONSTRAINT "VotePackage_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "VotePackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
