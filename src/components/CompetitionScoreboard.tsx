import type { CSSProperties } from "react";
import {
  formatJuryNote,
  formatParcoursNote,
  formatScore,
  juryPoints,
  phaseFinalScore,
  votePoints,
} from "@/lib/scoring";
import {
  isScoringPhaseNumber,
  parcoursPercent,
} from "@/lib/jury-score";
import { formatVotes } from "@/lib/money";

export type CompetitionPhaseScore = {
  phaseId: string;
  phaseNumber: number;
  phaseLabel: string;
  status: string;
  votesCount: number;
  juryScore: number;
  juryRatedCount: number;
  juryExpected: number;
  finalScore: number;
  votePart: number;
  juryPart: number;
  rank: number | null;
  fieldSize: number;
};

type Props = {
  stageName: string;
  current: CompetitionPhaseScore | null;
  history: CompetitionPhaseScore[];
  scoringPhaseCount?: number;
};

export function CompetitionScoreboard({
  stageName,
  current,
  history,
  scoringPhaseCount = 0,
}: Props) {
  if (!current && history.length === 0) {
    return null;
  }

  const score = current;
  const juryPending = Boolean(score && score.juryRatedCount === 0);
  const scoringHistory = history.filter((item) =>
    isScoringPhaseNumber(item.phaseNumber),
  );
  const phaseCount =
    scoringPhaseCount > 0 ? scoringPhaseCount : scoringHistory.length;
  const cumulativeScore = scoringHistory.reduce(
    (sum, item) => sum + item.finalScore,
    0,
  );
  const hasCumul = scoringHistory.length > 0 || phaseCount > 0;
  const ringValue = hasCumul
    ? parcoursPercent(cumulativeScore, phaseCount)
    : score
      ? juryPending
        ? 0
        : Math.min(100, Math.max(0, score.finalScore))
      : 0;

  return (
    <section className="comp-scoreboard" aria-label="Points compétition">
      <div className="comp-scoreboard-head">
        <p className="muted">Compétition</p>
        <h2>Points de {stageName}</h2>
      </div>

      {score ? (
        <div className="comp-score-hero">
          <div
            className="comp-score-ring"
            style={
              {
                "--score": String(ringValue),
              } as CSSProperties
            }
          >
            <div className="comp-score-ring-inner">
              {juryPending && !hasCumul ? (
                <>
                  <strong className="comp-score-pending">—</strong>
                  <span>Jury</span>
                </>
              ) : (
                <>
                  <strong>
                    {hasCumul
                      ? formatScore(cumulativeScore)
                      : formatScore(score.finalScore)}
                  </strong>
                  <span>{hasCumul ? "Cumul" : "Score"}</span>
                </>
              )}
            </div>
          </div>

          <div className="comp-score-meta">
            <p className="comp-score-phase">{score.phaseLabel}</p>
            {score.rank ? (
              <p className="comp-score-rank">
                <strong>#{score.rank}</strong>
                <span className="muted"> / {score.fieldSize}</span>
              </p>
            ) : (
              <p className="muted">Hors classement actif</p>
            )}
            {juryPending ? (
              <p className="comp-score-wait">
                Note jury en attente. Les votes fans restent visibles.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {score ? (
        <div className="comp-score-grid">
          <article className="comp-score-card">
            <p className="muted">Votes cumulés</p>
            <strong>{formatVotes(score.votesCount)}</strong>
          </article>
          <article className="comp-score-card">
            <p className="muted">Note jury</p>
            <strong>
              {juryPending ? "En attente" : formatJuryNote(score.juryScore)}
            </strong>
            <span className="comp-score-sub">
              {score.juryRatedCount}/{score.juryExpected} jurés
            </span>
          </article>
          <article className="comp-score-card">
            <p className="muted">Points parcours</p>
            <strong>
              {hasCumul
                ? formatParcoursNote(cumulativeScore, phaseCount)
                : juryPending
                  ? "—"
                  : formatScore(score.finalScore)}
            </strong>
            <span className="comp-score-sub">
              / {100 * phaseCount} · hors E0
            </span>
          </article>
        </div>
      ) : null}

      {history.length > 1 ? (
        <div className="comp-score-history">
          <p className="comp-score-history-title">Parcours des phases</p>
          <ul className="comp-score-timeline">
            {history.map((item) => {
              const pending = item.juryRatedCount === 0;
              return (
                <li key={item.phaseId} className="comp-score-timeline-item">
                  <span className="comp-score-timeline-ep">
                    E{item.phaseNumber}
                  </span>
                  <div className="comp-score-timeline-body">
                    <strong>{item.phaseLabel}</strong>
                    <span className="muted">
                      {item.rank ? `#${item.rank}` : item.status}
                      {" · "}
                      {formatVotes(item.votesCount)} votes
                      {" · "}
                      {pending
                        ? "jury en attente"
                        : `score ${formatScore(item.finalScore)}`}
                    </span>
                  </div>
                  <span className="comp-score-timeline-score">
                    {pending ? "—" : formatScore(item.finalScore)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/** Helper serveur pour construire les scores d'un candidat. */
export function buildCompetitionScores(args: {
  phaseNumber: number;
  phaseLabel: string;
  entry: {
    phaseId: string;
    status: string;
    votesCount: number;
    juryScore: number;
    juryRatedCount: number;
  };
  maxVotes: number;
  rank: number | null;
  fieldSize: number;
  juryExpected: number;
}): CompetitionPhaseScore {
  const votePart = votePoints(
    args.entry.votesCount,
    args.maxVotes,
    args.phaseNumber,
  );
  const juryPart = juryPoints(args.entry.juryScore, args.phaseNumber);
  const finalScore = phaseFinalScore(
    args.entry,
    args.maxVotes,
    args.phaseNumber,
  );

  return {
    phaseId: args.entry.phaseId,
    phaseNumber: args.phaseNumber,
    phaseLabel: args.phaseLabel,
    status: args.entry.status,
    votesCount: args.entry.votesCount,
    juryScore: args.entry.juryScore,
    juryRatedCount: args.entry.juryRatedCount,
    juryExpected: args.juryExpected,
    finalScore,
    votePart,
    juryPart,
    rank: args.rank,
    fieldSize: args.fieldSize,
  };
}
