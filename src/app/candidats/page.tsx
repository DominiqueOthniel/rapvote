import { ArtistCards } from "@/components/ArtistCards";
import {
  getActiveSeason,
  getCurrentPhase,
  getPhaseEntries,
} from "@/lib/competition";
import { getEpisodeByNumber } from "@/lib/parcours";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CandidatsPage() {
  const season = await getActiveSeason();
  const phase = season ? await getCurrentPhase(season.id) : null;
  const entries = phase ? await getPhaseEntries(phase.id) : [];
  const episode = phase ? getEpisodeByNumber(phase.number) : null;

  const candidateIds = entries.map((entry) => entry.candidate.id);
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
  const artists = entries.map((entry) => ({
    slug: entry.candidate.slug,
    stageName: entry.candidate.stageName,
    city: entry.candidate.city,
    bio: entry.candidate.bio,
    photoUrl: entry.candidate.photoUrl,
    votesCount: entry.votesCount,
    juryScore: entry.juryScore,
    juryRatedCount: entry._count.juryScores,
    trackCount: trackCountById[entry.candidate.id] ?? 0,
    rank: entry.status === "active" ? ++activeRank : undefined,
    eliminated: entry.status === "eliminated",
  }));

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
        </div>
      </div>
      <ArtistCards artists={artists} />
    </main>
  );
}
