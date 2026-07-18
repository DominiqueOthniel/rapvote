import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActiveSeason } from "@/lib/competition";
import { EXPECTED_JURY_COUNT, asJuryScoreOutOf10 } from "@/lib/jury";
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
} from "@/lib/scoring";
import { formatVotes } from "@/lib/money";

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
      data: { status: "active" },
    });

    const previousActive = season.phases.find((p) => p.status === "active");
    if (previousActive) {
      const survivors = await db.phaseEntry.findMany({
        where: { phaseId: previousActive.id, status: "active" },
      });
      for (const entry of survivors) {
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
            votesCount: 0,
            juryScore: 0,
          },
          update: { status: "active" },
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

  const activeEntries = sortByFinalScore(
    rawEntries.filter((entry) => entry.status === "active"),
  );
  const eliminatedEntries = rawEntries
    .filter((entry) => entry.status !== "active")
    .sort((a, b) => b.votesCount - a.votesCount);
  const entries = [...activeEntries, ...eliminatedEntries];
  const maxVotes = getMaxVotes(rawEntries);

  return (
    <main>
      <h1 className="page-title">Phases</h1>
      <p className="muted">Active une phase pour ouvrir les votes.</p>

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
                </p>
                {phase.status !== "active" ? (
                  <form action={activatePhase}>
                    <input type="hidden" name="phaseId" value={phase.id} />
                    <button className="btn-ghost" type="submit">
                      Activer
                    </button>
                  </form>
                ) : (
                  <span className="phase-active-label">Active</span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {active ? (
        <>
          <div className="admin-card score-rules">
            <h2 className="admin-form-title">Barème phase {active.number}</h2>
            <p className="muted score-rules-text">
              Les votes représentent <strong>{Math.round(VOTE_WEIGHT * 100)}%</strong>{" "}
              du score. Le jury représente{" "}
              <strong>{Math.round(JURY_WEIGHT * 100)}%</strong> via la moyenne des{" "}
              {EXPECTED_JURY_COUNT} notes (0 à 10). Les jurys notent sur{" "}
              <a href="/jury/login">/jury</a>.
            </p>
            <div className="score-rules-formula">
              Score final = (part votes × {Math.round(VOTE_WEIGHT * 100)}%) + (moyenne
              jury × {Math.round(JURY_WEIGHT * 100)}%)
            </div>
            <p className="muted" style={{ marginTop: "0.75rem" }}>
              Profils jury :{" "}
              {juries.length === 0
                ? "aucun (lance le seed)"
                : juries.map((j) => j.name).join(" · ")}
            </p>
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
                    <th>Votes</th>
                    <th>Part votes</th>
                    {juries.map((jury) => (
                      <th key={jury.id}>{jury.name}</th>
                    ))}
                    <th>Moyenne jury</th>
                    <th>Part jury</th>
                    <th>Score final</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, index) => {
                    const isActive = entry.status === "active";
                    const rank = isActive ? index + 1 : null;
                    const votePart = votePoints(entry.votesCount, maxVotes);
                    const juryPart = juryPoints(entry.juryScore);
                    const finalScore = phaseFinalScore(entry, maxVotes);
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
                              {note ? `${asJuryScoreOutOf10(note.score)}/10` : "—"}
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
