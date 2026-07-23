import {
  getRubricForPhase,
  parseBreakdown,
  type CriterionDef,
  type RubricDef,
} from "@/lib/judging";
import { asJuryScoreOutOf100, formatJuryNote } from "@/lib/jury-score";

export type JuryNoteRow = {
  juryName: string;
  score: number;
  breakdown: Record<string, number>;
};

export type CriterionAverage = CriterionDef & {
  average: number;
  fillPct: number;
};

export function averageCriteria(
  rubric: RubricDef,
  notes: JuryNoteRow[],
): CriterionAverage[] {
  if (notes.length === 0) {
    return rubric.criteria.map((criterion) => ({
      ...criterion,
      average: 0,
      fillPct: 0,
    }));
  }

  return rubric.criteria.map((criterion) => {
    const sum = notes.reduce(
      (total, note) => total + (note.breakdown[criterion.key] ?? 0),
      0,
    );
    const average = Math.round((sum / notes.length) * 10) / 10;
    const fillPct =
      criterion.max > 0
        ? Math.min(100, Math.max(0, (average / criterion.max) * 100))
        : 0;
    return { ...criterion, average, fillPct };
  });
}

export function weakestCriteria(criteria: CriterionAverage[], limit = 2) {
  return [...criteria]
    .filter((c) => c.max > 0)
    .sort((a, b) => a.fillPct - b.fillPct || a.average - b.average)
    .slice(0, limit)
    .filter((c) => c.fillPct < 75);
}

export type PhaseFeedback = {
  phaseId: string;
  phaseNumber: number;
  phaseLabel: string;
  notes: JuryNoteRow[];
};

type Props = {
  phases: PhaseFeedback[];
  /** Affiche aussi le détail par juré. */
  showPerJury?: boolean;
};

export function JuryFeedbackDetail({ phases, showPerJury = true }: Props) {
  const scored = phases.filter((phase) => phase.notes.length > 0);

  if (scored.length === 0) {
    return (
      <section
        id="jury-feedback"
        className="jury-feedback"
        aria-label="Détail des notes jury"
      >
        <div className="jury-feedback-head">
          <p className="muted">Feedback jury</p>
          <h2>Détail des notes</h2>
        </div>
        <p className="muted">
          Aucune note détaillée pour le moment. Dès qu&apos;un juré note, le
          détail des critères apparaît ici.
        </p>
      </section>
    );
  }

  return (
    <section
      id="jury-feedback"
      className="jury-feedback"
      aria-label="Détail des notes jury"
    >
      <div className="jury-feedback-head">
        <p className="muted">Feedback jury</p>
        <h2>Détail des notes</h2>
        <p className="muted">
          Vois comment tu as été noté sur chaque critère, et où progresser.
        </p>
      </div>

      <div className="jury-feedback-list">
        {scored.map((phase) => {
          const rubric = getRubricForPhase(phase.phaseNumber);
          const averaged = averageCriteria(rubric, phase.notes);
          const focus = weakestCriteria(averaged);
          const avgTotal =
            phase.notes.reduce((s, n) => s + asJuryScoreOutOf100(n.score), 0) /
            phase.notes.length;

          return (
            <article key={phase.phaseId} className="jury-feedback-card">
              <div className="jury-feedback-card-head">
                <div>
                  <p className="jury-feedback-ep">{phase.phaseLabel}</p>
                  <h3>{rubric.title}</h3>
                  {rubric.question ? (
                    <p className="jury-feedback-question">
                      « {rubric.question} »
                    </p>
                  ) : null}
                </div>
                <div className="jury-feedback-total">
                  <strong>{formatJuryNote(avgTotal)}</strong>
                  <span className="muted">
                    {phase.notes.length} juré
                    {phase.notes.length > 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <ul className="jury-feedback-criteria">
                {averaged.map((criterion) => (
                  <li key={criterion.key}>
                    <div className="jury-feedback-criterion-meta">
                      <span>{criterion.label}</span>
                      <strong>
                        {criterion.average.toFixed(1)}/{criterion.max}
                      </strong>
                    </div>
                    <div
                      className="jury-feedback-meter"
                      role="meter"
                      aria-valuemin={0}
                      aria-valuemax={criterion.max}
                      aria-valuenow={criterion.average}
                      aria-label={criterion.label}
                    >
                      <span
                        className="jury-feedback-meter-fill"
                        style={{ width: `${criterion.fillPct}%` }}
                      />
                    </div>
                    {criterion.hints?.length ? (
                      <p className="jury-feedback-hints muted">
                        {criterion.hints.join(" · ")}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>

              {focus.length > 0 ? (
                <div className="jury-feedback-improve">
                  <p className="jury-feedback-improve-title">À travailler</p>
                  <ul>
                    {focus.map((criterion) => (
                      <li key={criterion.key}>
                        <strong>{criterion.label}</strong>
                        {criterion.hints?.length
                          ? ` · ${criterion.hints.join(", ")}`
                          : ` · viser plus près de /${criterion.max}`}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="jury-feedback-solid">
                  Solide sur tous les critères de cette phase.
                </p>
              )}

              {showPerJury ? (
                <div className="jury-feedback-jurors">
                  <p className="jury-feedback-jurors-title">Par juré</p>
                  <ul>
                    {phase.notes.map((note) => (
                      <li key={`${phase.phaseId}-${note.juryName}`}>
                        <div className="jury-feedback-juror-head">
                          <strong>{note.juryName}</strong>
                          <span>{formatJuryNote(note.score)}</span>
                        </div>
                        <p className="muted jury-feedback-juror-split">
                          {rubric.criteria
                            .map((c) => {
                              const v = note.breakdown[c.key] ?? 0;
                              return `${c.label} ${v}/${c.max}`;
                            })
                            .join(" · ")}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function mapJuryNotes(
  scores: Array<{
    score: number;
    breakdown: unknown;
    jury: { name: string };
  }>,
): JuryNoteRow[] {
  return scores.map((row) => ({
    juryName: row.jury.name,
    score: row.score,
    breakdown: parseBreakdown(row.breakdown),
  }));
}
