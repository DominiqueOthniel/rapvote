import Image from "next/image";
import Link from "next/link";
import { ArtistCards } from "@/components/ArtistCards";
import { RankingList } from "@/components/RankingList";
import {
  getActiveSeason,
  getCurrentPhase,
  getPhaseEntries,
  getPhaseRanking,
} from "@/lib/competition";
import { getEpisodeByNumber } from "@/lib/parcours";

export const dynamic = "force-dynamic";

function SetupMessage({ message }: { message: string }) {
  return (
    <main className="shell">
      <div className="hero">
        <p className="hero-kicker">RapVote · New Star Punch</p>
        <h1>Configuration requise</h1>
        <p>{message}</p>
        <p className="muted" style={{ marginTop: "1rem" }}>
          Sur Netlify, ajoute TURSO_DATABASE_URL, TURSO_AUTH_TOKEN et AUTH_SECRET,
          puis relance un déploiement.
        </p>
      </div>
    </main>
  );
}

export default async function HomePage() {
  let season;
  try {
    season = await getActiveSeason();
  } catch {
    return (
      <SetupMessage message="Impossible de joindre la base de données. Vérifie les variables d'environnement Netlify." />
    );
  }

  if (!season) {
    return (
      <main className="shell">
        <div className="hero">
          <p className="hero-kicker">RapVote Cameroun</p>
          <h1>La scène arrive</h1>
          <p>Aucune saison active pour le moment. Reviens bientôt.</p>
        </div>
      </main>
    );
  }

  const phase = await getCurrentPhase(season.id);
  const ranking = phase ? await getPhaseRanking(phase.id) : [];
  const entries = phase ? await getPhaseEntries(phase.id) : [];
  const items = ranking.slice(0, 5).map((entry, index) => ({
    rank: index + 1,
    slug: entry.candidate.slug,
    stageName: entry.candidate.stageName,
    city: entry.candidate.city,
    votesCount: entry.votesCount,
  }));

  let activeRank = 0;
  const artists = entries.map((entry) => ({
    slug: entry.candidate.slug,
    stageName: entry.candidate.stageName,
    city: entry.candidate.city,
    bio: entry.candidate.bio,
    photoUrl: entry.candidate.photoUrl,
    votesCount: entry.votesCount,
    rank: entry.status === "active" ? ++activeRank : undefined,
    eliminated: entry.status === "eliminated",
  }));

  const episode = phase ? getEpisodeByNumber(phase.number) : null;

  return (
    <main>
      <section className="hero hero-visual">
        <div className="hero-stage" aria-hidden="true">
          <Image
            src="/hero/stage.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="hero-stage-img"
          />
          <div className="hero-stage-mask" />
        </div>
        <div className="hero-copy">
          <p className="hero-kicker">Rap · Cameroun · New Star Punch</p>
          <h1>RapVote</h1>
          <p>
            {season.tagline ??
              "Du freestyle à l'œuvre ultime. Jury, public, et un seul champion."}
          </p>
          <div className="hero-actions">
            <Link className="btn-primary" href="#artistes">
              Voir les artistes
            </Link>
            <Link className="btn-secondary" href="/phases">
              Le parcours
            </Link>
          </div>
        </div>
      </section>

      <div className="shell">
        <section id="artistes" className="section">
          <div className="section-head">
            <div>
              <p className="muted">
                {episode
                  ? `${episode.code} · ${episode.title}`
                  : phase
                    ? `Phase ${phase.number} · ${phase.theme ?? phase.title}`
                    : "Candidats"}
              </p>
              <h2>Les artistes</h2>
            </div>
          </div>
          <ArtistCards artists={artists} />
        </section>

        <section className="section">
          <div className="section-head">
            <div>
              <p className="muted">Temps réel</p>
              <h2>Top live</h2>
            </div>
            <Link className="btn-ghost" href="/classement">
              Classement complet
            </Link>
          </div>
          <RankingList items={items} />
        </section>
      </div>
    </main>
  );
}
