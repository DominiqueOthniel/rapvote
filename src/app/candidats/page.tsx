import { ArtistCards } from "@/components/ArtistCards";
import {
  getActiveSeason,
  getCompetitionStandings,
} from "@/lib/competition";
import { getEpisodeByNumber } from "@/lib/parcours";
import { prisma } from "@/lib/db";
import { formatParcoursNote } from "@/lib/jury-score";

export const dynamic = "force-dynamic";

export default async function CandidatsPage() {
  const season = await getActiveSeason();
  const { phase, standings, scoringPhaseCount } = season
    ? await getCompetitionStandings(season.id)
    : { phase: null, standings: [], scoringPhaseCount: 0 };
  const episode = phase ? getEpisodeByNumber(phase.number) : null;

  const candidateIds = standings.map((entry) => entry.candidate.id);
  const trackGroups =
    candidateIds.length > 0
      ? await prisma.phaseTrack.groupBy({
          by: ["candidateId"],
          where: { candidateId: { in: candidateIds } },
          _count: { _all: true },
        })
      : [];
  const trackCountById = Object.fromEntries(
    trackGroups.map((g) => [g.candidateId, g._count._all]),
  );

  let activeRank = 0;
  const artists = standings.map((entry) => ({
    slug: entry.candidate.slug,
    stageName: entry.candidate.stageName,
    city: entry.candidate.city,
    bio: entry.candidate.bio,
    photoUrl: entry.candidate.photoUrl,
    votesCount: entry.votesCount,
    juryScore: entry.juryScore,
    juryRatedCount: entry._count.juryScores,
    cumulativeScore: entry.cumulativeScore,
    scoringPhaseCount,
    trackCount: trackCountById[entry.candidate.id] ?? 0,
    rank: entry.status === "active" ? ++activeRank : undefined,
    eliminated: entry.status === "eliminated",
  }));

  const leader = artists.find((a) => a.rank === 1);

  return (
    <main className="shell section">
      <div className="section-head">
        <div>
          <p className="muted">
            {episode
              ? `${episode.code} · ${episode.title}`
              : phase
                ? `Phase ${phase.number} · ${phase.theme ?? phase.title}`
                : "Candidats"}
          </p>
          <h1 className="page-title">Candidats</h1>
          <p className="muted">
            Classement parcours · points / {100 * scoringPhaseCount} (hors E0)
            {leader
              ? ` · leader ${formatParcoursNote(leader.cumulativeScore ?? 0, scoringPhaseCount)}`
              : ""}
          </p>
        </div>
      </div>
      <ArtistCards artists={artists} />
    </main>
  );
}
