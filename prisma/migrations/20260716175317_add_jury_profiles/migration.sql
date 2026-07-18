-- CreateTable
CREATE TABLE "Jury" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "JuryScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "juryId" TEXT NOT NULL,
    "phaseEntryId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JuryScore_juryId_fkey" FOREIGN KEY ("juryId") REFERENCES "Jury" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JuryScore_phaseEntryId_fkey" FOREIGN KEY ("phaseEntryId") REFERENCES "PhaseEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Jury_email_key" ON "Jury"("email");

-- CreateIndex
CREATE UNIQUE INDEX "JuryScore_juryId_phaseEntryId_key" ON "JuryScore"("juryId", "phaseEntryId");
