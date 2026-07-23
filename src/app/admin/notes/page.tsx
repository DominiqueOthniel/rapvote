import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { getActiveSeason } from "@/lib/competition";
import { prisma } from "@/lib/db";
import { getEpisodeByNumber } from "@/lib/parcours";
import { getRubricForPhase, parseBreakdown } from "@/lib/judging";
import { asJuryScoreOutOf100, formatJuryNote } from "@/lib/jury-score";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ phaseId?: string }>;
};

export default async function AdminNotesPage({ searchParams }: Props) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const params = await searchParams;
  const season = await getActiveSeason();
  if (!season) {
    return (
      <main>
        <h1 className="page-title">Notes jury</h1>
        <p className="muted">Aucune saison active.</p>
      </main>
    );
  }

  const phases = season.phases;
  const selectedPhase =
    phases.find((phase) => phase.id === params.phaseId) ??
    phases.find((phase) => phase.status === "active") ??
    phases[0] ??
    null;

  const juries = await prisma.jury.findMany({ orderBy: { name: "asc" } });

  const entries = selectedPhase
    ? await prisma.phaseEntry.findMany({
        where: { phaseId: selectedPhase.id },
        include: {
          candidate: { select: { id: true, stageName: true, slug: true } },
          juryScores: {
            include: { jury: { select: { id: true, name: true } } },
            orderBy: { jury: { name: "asc" } },
          },
        },
        orderBy: { candidate: { stageName: "asc" } },
      })
    : [];

  const rubric = getRubricForPhase(selectedPhase?.number ?? 0);
  const episode = selectedPhase
    ? getEpisodeByNumber(selectedPhase.number)
    : null;

  return (
    <main>
      <h1 className="page-title">Notes jury</h1>
      <p className="muted">
        Détail des notations de chaque juré, épreuve par épreuve.
      </p>

      <div className="admin-notes-phases" role="tablist" aria-label="Épreuves">
        {phases.map((phase) => {
          const ep = getEpisodeByNumber(phase.number);
          const selected = selectedPhase?.id === phase.id;
          return (
            <Link
              key={phase.id}
              href={`/admin/notes?phaseId=${phase.id}`}
              className={
                selected
                  ? "admin-notes-phase is-selected"
                  : "admin-notes-phase"
              }
              role="tab"
              aria-selected={selected}
            >
              {ep?.code ?? `E${phase.number}`}
              <span className="muted">
                {" "}
                · {ep?.title ?? phase.theme ?? phase.title}
              </span>
            </Link>
          );
        })}
      </div>

      {!selectedPhase ? (
        <p className="muted">Aucune phase.</p>
      ) : (
        <section className="admin-card admin-notes-panel">
          <div className="admin-notes-head">
            <div>
              <h2 className="admin-form-title">
                {episode?.code ?? `E${selectedPhase.number}`} ·{" "}
                {rubric.title}
              </h2>
              <p className="muted">
                {entries.filter((e) => e.juryScores.length > 0).length}/
                {entries.length} artistes notés · {juries.length} jurés
              </p>
            </div>
          </div>

          {entries.length === 0 ? (
            <p className="muted">Aucun artiste inscrit sur cette épreuve.</p>
          ) : (
            <div className="admin-notes-list">
              {entries.map((entry) => {
                const byJury = new Map(
                  entry.juryScores.map((score) => [score.juryId, score]),
                );

                return (
                  <article key={entry.id} className="admin-notes-artist">
                    <div className="admin-notes-artist-head">
                      <div>
                        <h3>{entry.candidate.stageName}</h3>
                        <p className="muted">
                          Moyenne {formatJuryNote(entry.juryScore)} ·{" "}
                          {entry.juryScores.length}/{juries.length} notes
                        </p>
                      </div>
                      <Link
                        className="btn-ghost"
                        href={`/candidats/${entry.candidate.slug}`}
                      >
                        Profil
                      </Link>
                    </div>

                    <div className="table-wrap">
                      <table className="table table-scores admin-notes-table">
                        <thead>
                          <tr>
                            <th>Critère</th>
                            {juries.map((jury) => (
                              <th key={jury.id}>{jury.name}</th>
                            ))}
                            <th>Moyenne</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rubric.criteria.map((criterion) => {
                            const values = juries.map((jury) => {
                              const note = byJury.get(jury.id);
                              if (!note) return null;
                              const breakdown = parseBreakdown(note.breakdown);
                              return breakdown[criterion.key] ?? null;
                            });
                            const rated = values.filter(
                              (v): v is number => typeof v === "number",
                            );
                            const avg =
                              rated.length > 0
                                ? Math.round(
                                    (rated.reduce((a, b) => a + b, 0) /
                                      rated.length) *
                                      10,
                                  ) / 10
                                : null;

                            return (
                              <tr key={criterion.key}>
                                <td>
                                  {criterion.label}
                                  <span className="muted">
                                    {" "}
                                    /{criterion.max}
                                  </span>
                                </td>
                                {values.map((value, index) => (
                                  <td key={juries[index].id}>
                                    {value === null ? "—" : value}
                                  </td>
                                ))}
                                <td>
                                  {avg === null ? "—" : avg.toFixed(1)}
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="admin-notes-total-row">
                            <td>
                              <strong>Total</strong>
                            </td>
                            {juries.map((jury) => {
                              const note = byJury.get(jury.id);
                              return (
                                <td key={jury.id}>
                                  <strong>
                                    {note
                                      ? `${asJuryScoreOutOf100(note.score)}/100`
                                      : "—"}
                                  </strong>
                                </td>
                              );
                            })}
                            <td>
                              <strong>{formatJuryNote(entry.juryScore)}</strong>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
