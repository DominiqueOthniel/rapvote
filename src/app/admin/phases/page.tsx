import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getActiveSeason,
  cumulativeVotes,
  syncPhaseEntryVotes,
} from "@/lib/competition";
import { EXPECTED_JURY_COUNT, asJuryScoreOutOf100, getRubricForPhase } from "@/lib/jury";
import { getEpisodeByNumber, getEpisodeLabel } from "@/lib/parcours";
import {
  formatJuryNote,
  formatScore,
  getMaxVotes,
  juryPoints,
  phaseFinalScore,
  sortByFinalScore,
  votePoints,
  VOTE_WEIGHT,
  JURY_WEIGHT,
  PUBLIC_VOTES_FROM_PHASE,
  publicVotesAffectScore,
  weightsForPhase,
} from "@/lib/scoring";
import { formatVotes } from "@/lib/money";
import { SubmissionDeadlineForm } from "@/components/SubmissionDeadlineForm";

export const dynamic = "force-dynamic";

function revalidatePhaseViews() {
  revalidatePath("/admin/phases");
  revalidatePath("/");
  revalidatePath("/classement");
  revalidatePath("/phases");
  revalidatePath("/jury");
}

async function activatePhase(formData: FormData) {
  "use server";
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const phaseId = String(formData.get("phaseId") ?? "");
  const season = await getActiveSeason();
  if (!season || !phaseId) return;

  const target = season.phases.find((p) => p.id === phaseId);
  if (!target) return;

  await prisma.$transaction(async (db) => {
    await db.phase.updateMany({
      where: { seasonId: season.id, status: "active" },
      data: { status: "closed" },
    });
    await db.phase.update({
      where: { id: phaseId },
      data: { status: "active", votesOpen: true },
    });

    const previousActive = season.phases.find((p) => p.status === "active");
    if (previousActive) {
      const survivors = await db.phaseEntry.findMany({
        where: { phaseId: previousActive.id, status: "active" },
      });
      for (const entry of survivors) {
        const candidate = await db.candidate.findUnique({
          where: { id: entry.candidateId },
          select: { totalVotes: true },
        });
        const carriedVotes = candidate?.totalVotes ?? 0;
        await db.phaseEntry.upsert({
          where: {
            phaseId_candidateId: {
              phaseId: phaseId,
              candidateId: entry.candidateId,
            },
          },
          create: {
            phaseId,
            candidateId: entry.candidateId,
            status: "active",
            votesCount: carriedVotes,
            juryScore: 0,
          },
          update: {
            status: "active",
            votesCount: carriedVotes,
          },
        });
      }
    } else {
      const all = await db.candidate.findMany({ where: { seasonId: season.id } });
      for (const c of all) {
        await db.phaseEntry.upsert({
          where: {
            phaseId_candidateId: { phaseId, candidateId: c.id },
          },
          create: {
            phaseId,
            candidateId: c.id,
            status: "active",
          },
          update: {},
        });
      }
    }
  });

  revalidatePhaseViews();
}

async function eliminateCandidate(formData: FormData) {
  "use server";
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const entryId = String(formData.get("entryId") ?? "");
  if (!entryId) return;

  await prisma.phaseEntry.update({
    where: { id: entryId },
    data: { status: "eliminated" },
  });

  revalidatePhaseViews();
}

async function togglePhaseVotes(formData: FormData) {
  "use server";
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const phaseId = String(formData.get("phaseId") ?? "");
  const open = String(formData.get("open") ?? "") === "1";
  if (!phaseId) return;

  await prisma.phase.update({
    where: { id: phaseId },
    data: { votesOpen: open },
  });

  revalidatePhaseViews();
  revalidatePath("/candidats");
}

export default async function AdminPhasesPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const season = await getActiveSeason();
  const phases = season?.phases ?? [];
  const active = phases.find((p) => p.status === "active");
  const juries = await prisma.jury.findMany({ orderBy: { name: "asc" } });

  const rawEntries = active
    ? await prisma.phaseEntry.findMany({
        where: { phaseId: active.id },
        include: {
          candidate: true,
          juryScores: true,
        },
      })
    : [];

  if (active) {
    await syncPhaseEntryVotes(active.id);
  }

  const lateTracks = active
    ? await prisma.phaseTrack.findMany({
        where: { phaseId: active.id },
        select: { candidateId: true, lateSubmission: true },
      })
    : [];
  const lateByCandidate = new Map(
    lateTracks.map((track) => [track.candidateId, track.lateSubmission]),
  );

  const entriesWithVotes = rawEntries.map((entry) => ({
    ...entry,
    votesCount: cumulativeVotes(entry),
    lateSubmission: lateByCandidate.get(entry.candidateId) ?? false,
  }));

  const activeEntries = sortByFinalScore(
    entriesWithVotes.filter((entry) => entry.status === "active"),
    active?.number ?? 0,
  );
  const eliminatedEntries = entriesWithVotes
    .filter((entry) => entry.status !== "active")
    .sort((a, b) => b.votesCount - a.votesCount);
  const entries = [...activeEntries, ...eliminatedEntries];
  const maxVotes = getMaxVotes(entriesWithVotes);
  const rubric = getRubricForPhase(active?.number ?? 0);
  const phaseNumber = active?.number ?? 0;
  const weights = weightsForPhase(phaseNumber);
  const votesInScore = publicVotesAffectScore(phaseNumber);

  return (
    <main>
      <h1 className="page-title">Phases</h1>
      <p className="muted">
        Active une phase, puis ouvre ou bloque les votes quand tu veux. Détail
        des notes :{" "}
        <Link href="/admin/notes" className="btn-ghost">
          Notes jury
        </Link>
      </p>

      <div className="phase-grid admin-phase-grid">
        {phases.map((phase) => {
          const episode = getEpisodeByNumber(phase.number);
          return (
            <article
              key={phase.id}
              className={phase.status === "active" ? "phase-card active" : "phase-card"}
            >
              <span className="num">
                {episode?.code ?? String(phase.number).padStart(2, "0")}
              </span>
              <div>
                <strong>{episode?.title ?? phase.theme ?? phase.title}</strong>
                <p className="muted phase-status">
                  {episode ? getEpisodeLabel(episode) : null} · {phase.status}
                  {phase.status === "active"
                    ? phase.votesOpen
                      ? " · votes ouverts"
                      : " · votes bloqués"
                    : null}
                </p>
                {phase.status !== "active" ? (
                  <form action={activatePhase}>
                    <input type="hidden" name="phaseId" value={phase.id} />
                    <button className="btn-ghost" type="submit">
                      Activer
                    </button>
                  </form>
                ) : (
                  <div className="phase-vote-actions">
                    <span className="phase-active-label">Active</span>
                    <form action={togglePhaseVotes}>
                      <input type="hidden" name="phaseId" value={phase.id} />
                      <input
                        type="hidden"
                        name="open"
                        value={phase.votesOpen ? "0" : "1"}
                      />
                      <button className="btn-ghost" type="submit">
                        {phase.votesOpen ? "Bloquer les votes" : "Ouvrir les votes"}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {active ? (
        <>
          <div className="admin-card score-rules">
            <h2 className="admin-form-title">
              {rubric.title} · phase {active.number}
            </h2>
            {rubric.question ? (
              <p className="jury-question">« {rubric.question} »</p>
            ) : null}
            <p className="muted score-rules-text">
              Carnet officiel des jurés · note sur 100 (somme des critères).{" "}
              {votesInScore ? (
                <>
                  Votes publics :{" "}
                  <strong>{Math.round(weights.voteWeight * 100)}%</strong>, moyenne
                  des {EXPECTED_JURY_COUNT} jurys :{" "}
                  <strong>{Math.round(weights.juryWeight * 100)}%</strong>.
                </>
              ) : (
                <>
                  Jusqu&apos;à l&apos;épisode {PUBLIC_VOTES_FROM_PHASE - 1}, la note
                  est <strong>100% jury</strong> (les votes restent ouverts mais
                  n&apos;entrent pas dans le score). À partir de l&apos;épisode{" "}
                  {PUBLIC_VOTES_FROM_PHASE} : votes{" "}
                  {Math.round(VOTE_WEIGHT * 100)}% / jury{" "}
                  {Math.round(JURY_WEIGHT * 100)}%.
                </>
              )}{" "}
              Espace <a href="/jury/login">/jury</a>.
            </p>
            <ul className="rubric-preview">
              {rubric.criteria.map((c) => (
                <li key={c.key}>
                  {c.label} <strong>/{c.max}</strong>
                </li>
              ))}
            </ul>
            <div className="score-rules-formula">
              {votesInScore
                ? `Score final = (part votes × ${Math.round(weights.voteWeight * 100)}%) + (moyenne jury /100 × ${Math.round(weights.juryWeight * 100)}%)`
                : `Score final = moyenne jury /100 (votes hors note jusqu'à l'épisode ${PUBLIC_VOTES_FROM_PHASE - 1})`}
            </div>
            <p className="muted" style={{ marginTop: "0.75rem" }}>
              Profils jury :{" "}
              {juries.length === 0
                ? "aucun (lance le seed)"
                : juries.map((j) => j.name).join(" · ")}
            </p>
          </div>

          <div className="admin-card">
            <SubmissionDeadlineForm
              phaseId={active.id}
              phaseLabel={`E${active.number} · ${active.theme ?? active.title}`}
              deadline={active.submissionDeadlineAt}
            />
          </div>

          <div className="admin-card">
            <h2 className="admin-form-title">
              Phase {active.number} · résultats
            </h2>
            <div className="table-wrap">
              <table className="table table-scores">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Artiste</th>
                    <th>Votes cumulés</th>
                    <th>Part votes</th>
                    {juries.map((jury) => (
                      <th key={jury.id}>{jury.name}</th>
                    ))}
                    <th>Moyenne jury</th>
                    <th>Part jury</th>
                    <th>Score final</th>
                    <th>Retard</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, index) => {
                    const isActive = entry.status === "active";
                    const rank = isActive ? index + 1 : null;
                    const votePart = votePoints(
                      entry.votesCount,
                      maxVotes,
                      phaseNumber,
                    );
                    const juryPart = juryPoints(entry.juryScore, phaseNumber);
                    const finalScore = phaseFinalScore(
                      entry,
                      maxVotes,
                      phaseNumber,
                    );
                    const scoredCount = entry.juryScores.length;

                    return (
                      <tr key={entry.id}>
                        <td>{rank ?? "—"}</td>
                        <td>{entry.candidate.stageName}</td>
                        <td>{formatVotes(entry.votesCount)}</td>
                        <td>{formatScore(votePart)}</td>
                        {juries.map((jury) => {
                          const note = entry.juryScores.find((s) => s.juryId === jury.id);
                          return (
                            <td key={jury.id}>
                              {note
                                ? `${asJuryScoreOutOf100(note.score)}/100`
                                : "—"}
                            </td>
                          );
                        })}
                        <td>
                          <strong>{formatJuryNote(entry.juryScore)}</strong>
                          <div className="muted">
                            {scoredCount}/{EXPECTED_JURY_COUNT}
                          </div>
                        </td>
                        <td>{formatScore(juryPart)}</td>
                        <td>
                          <strong>{formatScore(finalScore)}</strong>
                        </td>
                        <td>
                          {entry.lateSubmission ? (
                            <span className="track-late-flag">-1.5</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>{entry.status}</td>
                        <td>
                          {isActive ? (
                            <form action={eliminateCandidate}>
                              <input type="hidden" name="entryId" value={entry.id} />
                              <button className="btn-ghost" type="submit">
                                Éliminer
                              </button>
                            </form>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </main>
  );
}
