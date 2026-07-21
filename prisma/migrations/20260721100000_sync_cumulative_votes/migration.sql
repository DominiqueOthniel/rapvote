-- Aligne les votes de phase sur le total cumulé candidat
UPDATE "PhaseEntry" pe
SET "votesCount" = c."totalVotes"
FROM "Candidate" c
WHERE pe."candidateId" = c.id
  AND pe."votesCount" < c."totalVotes";
