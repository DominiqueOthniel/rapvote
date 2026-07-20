import Image from "next/image";
import { notFound } from "next/navigation";
import { VoteForm } from "@/components/VoteForm";
import { prisma } from "@/lib/db";
import {
  getActiveSeason,
  getCurrentPhase,
} from "@/lib/competition";
import { formatVotes, formatXaf } from "@/lib/money";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function CandidatePage({ params }: Props) {
  const { slug } = await params;
  const candidate = await prisma.candidate.findUnique({ where: { slug } });
  if (!candidate) notFound();

  const season = await getActiveSeason();
  const phase = season ? await getCurrentPhase(season.id) : null;
  const packages = season?.packages ?? [];

  const entry = phase
    ? await prisma.phaseEntry.findUnique({
        where: {
          phaseId_candidateId: {
            phaseId: phase.id,
            candidateId: candidate.id,
          },
        },
      })
    : null;

  return (
    <main className="shell candidate-hero">
      <section className="candidate-panel candidate-profile">
        <div className="candidate-photo">
          {candidate.photoUrl ? (
            <Image
              src={candidate.photoUrl}
              alt={candidate.stageName}
              fill
              sizes="(max-width: 699px) 100vw, (max-width: 959px) 50vw, 40vw"
              className="candidate-photo-img"
              priority
            />
          ) : (
            <div className="artist-card-fallback">{candidate.stageName.slice(0, 2)}</div>
          )}
        </div>
        <div className="candidate-copy">
          <p className="muted">{candidate.city ?? "Cameroun"}</p>
          <h1>{candidate.stageName}</h1>
          <p className="candidate-bio">
            {candidate.bio ?? "Artiste en compétition ForTheCulture."}
          </p>
          <div className="candidate-stats">
            <div>
              <p className="muted">Votes phase</p>
              <strong>{formatVotes(entry?.votesCount ?? 0)}</strong>
            </div>
            <div>
              <p className="muted">Gains artiste</p>
              <strong>{formatXaf(candidate.totalEarnedXaf)}</strong>
            </div>
          </div>
          {phase ? (
            <p className="muted">
              Phase {phase.number} · {phase.theme ?? phase.title}
            </p>
          ) : null}
        </div>
      </section>

      {phase && entry?.status === "active" && phase.votesOpen ? (
        <VoteForm
          candidateId={candidate.id}
          candidateName={candidate.stageName}
          phaseId={phase.id}
          packages={packages}
        />
      ) : (
        <section className="vote-form">
          <h2>Votes fermés</h2>
          <p className="muted">
            {!phase || entry?.status !== "active"
              ? "Ce candidat n'est pas votable sur la phase en cours."
              : "Les votes sont temporairement bloqués par l'administration."}
          </p>
        </section>
      )}
    </main>
  );
}
