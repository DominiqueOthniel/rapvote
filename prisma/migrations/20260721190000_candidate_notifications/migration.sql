-- CreateTable
CREATE TABLE "CandidateNotification" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "trackId" TEXT,
    "fanId" TEXT,
    "commentId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CandidateNotification_candidateId_createdAt_idx" ON "CandidateNotification"("candidateId", "createdAt");

-- CreateIndex
CREATE INDEX "CandidateNotification_candidateId_readAt_idx" ON "CandidateNotification"("candidateId", "readAt");

-- AddForeignKey
ALTER TABLE "CandidateNotification" ADD CONSTRAINT "CandidateNotification_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
