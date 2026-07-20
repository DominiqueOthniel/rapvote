-- CreateTable
CREATE TABLE "Fan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhaseTrack" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "title" TEXT,
    "audioUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhaseTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackComment" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "fanId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Fan_phone_key" ON "Fan"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "PhaseTrack_candidateId_phaseId_key" ON "PhaseTrack"("candidateId", "phaseId");

-- AddForeignKey
ALTER TABLE "PhaseTrack" ADD CONSTRAINT "PhaseTrack_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhaseTrack" ADD CONSTRAINT "PhaseTrack_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackComment" ADD CONSTRAINT "TrackComment_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "PhaseTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackComment" ADD CONSTRAINT "TrackComment_fanId_fkey" FOREIGN KEY ("fanId") REFERENCES "Fan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
