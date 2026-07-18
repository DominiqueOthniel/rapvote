-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PhaseEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phaseId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "votesCount" INTEGER NOT NULL DEFAULT 0,
    "juryScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PhaseEntry_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PhaseEntry_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PhaseEntry" ("candidateId", "createdAt", "id", "phaseId", "status", "updatedAt", "votesCount") SELECT "candidateId", "createdAt", "id", "phaseId", "status", "updatedAt", "votesCount" FROM "PhaseEntry";
DROP TABLE "PhaseEntry";
ALTER TABLE "new_PhaseEntry" RENAME TO "PhaseEntry";
CREATE UNIQUE INDEX "PhaseEntry_phaseId_candidateId_key" ON "PhaseEntry"("phaseId", "candidateId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
