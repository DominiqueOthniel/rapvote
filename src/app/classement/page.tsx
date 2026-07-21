import { ArtistCards } from "@/components/ArtistCards";
import {
  getActiveSeason,
  getCurrentPhase,
  getPhaseEntries,
} from "@/lib/competition";
import { reconcilePendingVotes } from "@/lib/reconcile-votes";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ClassementPage() {
  // Filet de sécurité: crédite les votes déjà payés chez Notch.
  await reconcilePendingVotes(12).catch((error) => {
    console.error("classement reconcile", error);
  });

  const season = await getActiveSeason();
  const phase = season ? await getCurrentPhase(season.id) : null;
  const ranking = phase ? await getPhaseEntries(phase.id) : [];

  const candidateIds = ranking.map((entry) => entry.candidate.id);
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
  const artists = ranking.map((entry) => ({
    rank: entry.status === "active" ? ++activeRank : undefined,
    slug: entry.candidate.slug,
    stageName: entry.candidate.stageName,
    city: entry.candidate.city,
    bio: entry.candidate.bio,
    photoUrl: entry.candidate.photoUrl,
    votesCount: entry.votesCount,
    trackCount: trackCountById[entry.candidate.id] ?? 0,
    eliminated: entry.status === "eliminated",
  }));

  return (
    <main className="shell section">
      <div className="section-head">
        <div>
          <p className="muted">
            {phase
              ? `Phase ${phase.number} · ${phase.theme ?? phase.title}`
              : "Aucune phase"}
          </p>
          <h1 className="page-title">Classement</h1>
        </div>
      </div>
      <ArtistCards artists={artists} />
    </main>
  );
}
