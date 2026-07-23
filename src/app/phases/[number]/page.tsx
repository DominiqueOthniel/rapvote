import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveSeason } from "@/lib/competition";
import {
  COMPETITION_BRAND,
  getEpisodeByNumber,
  getEpisodeLabel,
} from "@/lib/parcours";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ number: string }> };

function statusLabel(status: string) {
  if (status === "active") return "En cours";
  if (status === "closed") return "Terminée";
  return "À venir";
}

export default async function PhaseDetailPage({ params }: Props) {
  const { number: raw } = await params;
  const number = Number(raw);
  if (Number.isNaN(number)) notFound();

  const episode = getEpisodeByNumber(number);
  if (!episode) notFound();

  const season = await getActiveSeason();
  const dbPhase = season?.phases.find((phase) => phase.number === number);
  const status = dbPhase?.status ?? "upcoming";

  const prev = getEpisodeByNumber(number - 1);
  const next = getEpisodeByNumber(number + 1);

  return (
    <main className="shell section">
      <div className="parcours-detail-nav">
        <Link className="muted" href="/phases">
          ← Le parcours
        </Link>
        <span
          className={
            status === "active"
              ? "parcours-status parcours-status-active"
              : "parcours-status"
          }
        >
          {statusLabel(status)}
        </span>
      </div>

      <p className="hero-kicker">
        {COMPETITION_BRAND} · {getEpisodeLabel(episode)}
      </p>
      <h1 className="page-title">{episode.title}</h1>
      {episode.slogan ? (
        <p className="parcours-detail-slogan">{episode.slogan}</p>
      ) : null}

      <section className="parcours-detail-grid">
        <article className="admin-card">
          <h2 className="admin-form-title">Objectif</h2>
          <p>{episode.objective}</p>
        </article>

        {episode.flow?.length ? (
          <article className="admin-card">
            <h2 className="admin-form-title">Déroulement</h2>
            <ul className="parcours-bullets">
              {episode.flow.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ) : null}

        {episode.conditions?.length ? (
          <article className="admin-card">
            <h2 className="admin-form-title">Conditions</h2>
            <ul className="parcours-bullets">
              {episode.conditions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ) : null}

        {episode.examples?.length ? (
          <article className="admin-card">
            <h2 className="admin-form-title">Exemples</h2>
            <ul className="parcours-bullets">
              {episode.examples.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ) : null}

        {episode.juryCriteria?.length ? (
          <article className="admin-card">
            <h2 className="admin-form-title">Le jury évaluera</h2>
            <ul className="parcours-criteria">
              {episode.juryCriteria.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ) : null}

        {episode.notes?.length ? (
          <article className="admin-card parcours-notes">
            <h2 className="admin-form-title">À retenir</h2>
            <ul className="parcours-bullets">
              {episode.notes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ) : null}
      </section>

      <div className="parcours-detail-actions">
        {prev ? (
          <Link className="btn-secondary" href={`/phases/${prev.number}`}>
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link className="btn-primary" href={`/phases/${next.number}`}>
            {next.title} →
          </Link>
        ) : (
          <Link className="btn-primary" href="/candidats">
            Voir les artistes
          </Link>
        )}
      </div>
    </main>
  );
}
