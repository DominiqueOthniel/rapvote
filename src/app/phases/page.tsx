import Link from "next/link";
import { getActiveSeason } from "@/lib/competition";
import {
  COMPETITION_BRAND,
  COMPETITION_CONCLUSION,
  EPISODES,
  getEpisodeLabel,
} from "@/lib/parcours";

export const dynamic = "force-dynamic";

function statusLabel(status: string) {
  if (status === "active") return "En cours";
  if (status === "closed") return "Terminée";
  return "À venir";
}

export default async function PhasesPage() {
  const season = await getActiveSeason();
  const dbPhases = season?.phases ?? [];
  const phaseByNumber = new Map(dbPhases.map((phase) => [phase.number, phase]));

  const episodes = EPISODES.map((episode) => {
    const db = phaseByNumber.get(episode.number);
    return {
      ...episode,
      status: db?.status ?? "upcoming",
      phaseId: db?.id ?? null,
    };
  });

  const active = episodes.find((episode) => episode.status === "active");
  const blocks = [
    {
      key: "episodes",
      title: "Épisodes",
      items: episodes.filter((e) => e.stage === "episode"),
    },
    {
      key: "demi",
      title: "Demi-finale",
      items: episodes.filter((e) => e.stage === "demi"),
    },
    {
      key: "finale",
      title: "Grande finale",
      items: episodes.filter((e) => e.stage === "finale"),
    },
  ];

  return (
    <main className="shell section">
      <div className="section-head parcours-hero-head">
        <div>
          <p className="muted">{season?.title ?? COMPETITION_BRAND}</p>
          <h1 className="page-title">Le parcours</h1>
          <p className="parcours-intro">
            {season?.tagline ??
              "Treize étapes. Du premier regard à l'œuvre ultime."}
          </p>
        </div>
        {active ? (
          <Link className="btn-ghost" href={`/phases/${active.number}`}>
            En cours · {active.title}
          </Link>
        ) : null}
      </div>

      {blocks.map((block) => (
        <section key={block.key} className="parcours-block">
          <h2 className="parcours-block-title">{block.title}</h2>
          <div className="parcours-list">
            {block.items.map((episode) => {
              const isActive = episode.status === "active";
              return (
                <Link
                  key={episode.number}
                  href={`/phases/${episode.number}`}
                  className={
                    isActive
                      ? "parcours-card parcours-card-active"
                      : "parcours-card"
                  }
                >
                  <div className="parcours-card-top">
                    <span className="parcours-code">{episode.code}</span>
                    <span
                      className={
                        isActive
                          ? "parcours-status parcours-status-active"
                          : "parcours-status"
                      }
                    >
                      {statusLabel(episode.status)}
                    </span>
                  </div>
                  <p className="parcours-label">{getEpisodeLabel(episode)}</p>
                  <h3>{episode.title}</h3>
                  {episode.slogan ? (
                    <p className="parcours-slogan">{episode.slogan}</p>
                  ) : (
                    <p className="muted">{episode.objective}</p>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      <section className="admin-card parcours-conclusion">
        <p className="parcours-conclusion-text">{COMPETITION_CONCLUSION}</p>
      </section>
    </main>
  );
}
