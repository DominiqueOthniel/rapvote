import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getJurySession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActiveSeason, getCurrentPhase } from "@/lib/competition";
import { EXPECTED_JURY_COUNT, asJuryScoreOutOf10, upsertJuryScore } from "@/lib/jury";
import { formatJuryNote } from "@/lib/scoring";

export const dynamic = "force-dynamic";

async function saveScore(formData: FormData) {
  "use server";
  const jury = await getJurySession();
  if (!jury) redirect("/jury/login");

  const entryId = String(formData.get("entryId") ?? "");
  const raw = Number(formData.get("score"));
  if (!entryId || Number.isNaN(raw)) return;

  const entry = await prisma.phaseEntry.findUnique({
    where: { id: entryId },
    include: { phase: true },
  });
  if (!entry || entry.status !== "active" || entry.phase.status !== "active") {
    return;
  }

  await upsertJuryScore({
    juryId: jury.id,
    phaseEntryId: entryId,
    score: raw,
  });

  revalidatePath("/jury");
  revalidatePath("/admin/phases");
  revalidatePath("/");
  revalidatePath("/classement");
}

export default async function JuryHomePage() {
  const jury = await getJurySession();
  if (!jury) redirect("/jury/login");

  const season = await getActiveSeason();
  const phase = season ? await getCurrentPhase(season.id) : null;
  const activePhase = phase?.status === "active" ? phase : null;

  const entries = activePhase
    ? await prisma.phaseEntry.findMany({
        where: { phaseId: activePhase.id, status: "active" },
        include: {
          candidate: true,
          juryScores: { include: { jury: true }, orderBy: { jury: { name: "asc" } } },
        },
        orderBy: { candidate: { stageName: "asc" } },
      })
    : [];

  return (
    <main>
      <h1 className="page-title">Notation jury</h1>
      <p className="muted">
        Connecté en tant que <strong>{jury.name}</strong>. Chaque note est sur 10.
        La moyenne des {EXPECTED_JURY_COUNT} jurys compte pour 85% du score final.
      </p>

      {!activePhase ? (
        <div className="admin-card" style={{ marginTop: "1.5rem" }}>
          <p className="muted">Aucune phase active pour le moment.</p>
        </div>
      ) : (
        <div className="admin-card" style={{ marginTop: "1.5rem" }}>
          <h2 className="admin-form-title">
            Phase {activePhase.number} · {activePhase.theme ?? activePhase.title}
          </h2>
          <div className="table-wrap">
            <table className="table table-scores">
              <thead>
                <tr>
                  <th>Artiste</th>
                  <th>Ma note</th>
                  <th>Notes reçues</th>
                  <th>Moyenne</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const mine = entry.juryScores.find((s) => s.juryId === jury.id);
                  const received = entry.juryScores.length;

                  return (
                    <tr key={entry.id}>
                      <td>
                        <strong>{entry.candidate.stageName}</strong>
                        <div className="muted">{entry.candidate.city ?? "—"}</div>
                      </td>
                      <td>
                        <form action={saveScore} className="jury-form">
                          <input type="hidden" name="entryId" value={entry.id} />
                          <input
                            className="jury-input"
                            name="score"
                            type="number"
                            min={0}
                            max={10}
                            step={1}
                            defaultValue={
                              mine ? asJuryScoreOutOf10(mine.score) : ""
                            }
                            placeholder="0-10"
                            required
                          />
                          <button className="btn-ghost jury-save" type="submit">
                            OK
                          </button>
                        </form>
                      </td>
                      <td>
                        {received}/{EXPECTED_JURY_COUNT}
                        <div className="muted jury-score-list">
                          {entry.juryScores.length === 0
                            ? "Aucune note"
                            : entry.juryScores
                                .map(
                                  (s) =>
                                    `${s.jury.name}: ${asJuryScoreOutOf10(s.score)}/10`,
                                )
                                .join(" · ")}
                        </div>
                      </td>
                      <td>
                        <strong>{formatJuryNote(entry.juryScore)}</strong>
                      </td>
                      <td>
                        {mine ? (
                          <span className="phase-active-label">Noté</span>
                        ) : (
                          <span className="muted">À noter</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
