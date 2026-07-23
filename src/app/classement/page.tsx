import Link from "next/link";
import { RankingList } from "@/components/RankingList";
import {
  getActiveSeason,
  getCurrentPhase,
  getPhaseRanking,
} from "@/lib/competition";

export const dynamic = "force-dynamic";

export default async function ClassementPage() {
  const season = await getActiveSeason();
  const phase = season ? await getCurrentPhase(season.id) : null;
  // Lecture seule: sync votes côté paiement / webhook, pas au chargement page.
  const ranking = phase
    ? await getPhaseRanking(phase.id, { syncVotes: false })
    : [];

  const items = ranking.map((entry, index) => ({
    rank: index + 1,
    slug: entry.candidate.slug,
    stageName: entry.candidate.stageName,
    city: entry.candidate.city,
    votesCount: entry.votesCount,
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
        <Link className="btn-secondary" href="/candidats">
          Voir les candidats
        </Link>
      </div>
      <RankingList items={items} />
    </main>
  );
}
