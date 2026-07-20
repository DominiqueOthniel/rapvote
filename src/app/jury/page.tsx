import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getJurySession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActiveSeason, getCurrentPhase } from "@/lib/competition";
import {
  EXPECTED_JURY_COUNT,
  asJuryScoreOutOf100,
  getRubricForPhase,
  upsertJuryRubricScore,
} from "@/lib/jury";
import { formatJuryNote } from "@/lib/scoring";
import { JuryScoreForm } from "@/components/JuryScoreForm";
import { COMPETITION_BRAND } from "@/lib/parcours";

export const dynamic = "force-dynamic";

async function saveRubricScore(formData: FormData) {
  "use server";
  const jury = await getJurySession();
  if (!jury) redirect("/jury/login");

  const entryId = String(formData.get("entryId") ?? "");
  if (!entryId) return;

  const entry = await prisma.phaseEntry.findUnique({
    where: { id: entryId },
    include: { phase: true },
  });
  if (!entry || entry.status !== "active" || entry.phase.status !== "active") {
    return;
  }

  await upsertJuryRubricScore({
    juryId: jury.id,
    phaseEntryId: entryId,
    phaseNumber: entry.phase.number,
    formData,
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
  const rubric = getRubricForPhase(activePhase?.number ?? 0);

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
      <h1 className="page-title">Carnet des jurés</h1>
      <p className="muted">
        {COMPETITION_BRAND} · Connecté en tant que <strong>{jury.name}</strong>.
        Note chaque critère. Le total /100 se calcule automatiquement. La moyenne
        des {EXPECTED_JURY_COUNT} jurys compte pour 85% du score final à partir de
        l&apos;épisode 9 (avant : 100% jury). Les votes restent ouverts dès le
        début, mais n&apos;entrent dans la note qu&apos;à partir de l&apos;épisode
        9.
      </p>

      {!activePhase ? (
        <div className="admin-card" style={{ marginTop: "1.5rem" }}>
          <p className="muted">Aucune phase active pour le moment.</p>
        </div>
      ) : (
        <>
          <div className="admin-card score-rules" style={{ marginTop: "1.5rem" }}>
            <h2 className="admin-form-title">
              {rubric.title} · Épisode {activePhase.number}
            </h2>
            {rubric.question ? (
              <p className="jury-question">« {rubric.question} »</p>
            ) : null}
            <p className="muted score-rules-text">
              Barème officiel sur 100 points. Remplis chaque critère puis
              enregistre.
            </p>
          </div>

          <div className="jury-entry-list">
            {entries.map((entry) => {
              const mine = entry.juryScores.find((s) => s.juryId === jury.id);
              const received = entry.juryScores.length;

              return (
                <article key={entry.id} className="admin-card jury-entry-card">
                  <div className="jury-entry-head">
                    <div>
                      <h2 className="admin-form-title">{entry.candidate.stageName}</h2>
                      <p className="muted">
                        {entry.candidate.city ?? "Cameroun"} · Notes reçues{" "}
                        {received}/{EXPECTED_JURY_COUNT}
                      </p>
                    </div>
                    <div className="jury-entry-meta">
                      <strong>{formatJuryNote(entry.juryScore)}</strong>
                      <span className="muted">moyenne jury</span>
                      {mine ? (
                        <span className="phase-active-label">
                          Ta note : {asJuryScoreOutOf100(mine.score)}/100
                        </span>
                      ) : (
                        <span className="muted">À noter</span>
                      )}
                    </div>
                  </div>

                  {entry.juryScores.length > 0 ? (
                    <p className="muted jury-score-list">
                      {entry.juryScores
                        .map(
                          (s) =>
                            `${s.jury.name}: ${asJuryScoreOutOf100(s.score)}/100`,
                        )
                        .join(" · ")}
                    </p>
                  ) : null}

                  <JuryScoreForm
                    entryId={entry.id}
                    rubric={rubric}
                    action={saveRubricScore}
                    initialBreakdown={mine?.breakdown}
                    initialTotal={mine ? asJuryScoreOutOf100(mine.score) : 0}
                  />
                </article>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
