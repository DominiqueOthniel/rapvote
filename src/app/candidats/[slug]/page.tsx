import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VoteForm } from "@/components/VoteForm";
import { TrackComments } from "@/components/TrackComments";
import { BackNav } from "@/components/BackNav";
import { TrackListenCard } from "@/components/TrackListenCard";
import {
  CompetitionScoreboard,
  buildCompetitionScores,
  type CompetitionPhaseScore,
} from "@/components/CompetitionScoreboard";
import {
  getCandidateSession,
  getFanSession,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getActiveSeason,
  getCurrentPhase,
  getPhaseEntries,
} from "@/lib/competition";
import { getEpisodeByNumber } from "@/lib/parcours";
import { EXPECTED_JURY_COUNT } from "@/lib/jury";
import { getMaxVotes } from "@/lib/scoring";
import { formatVotes, formatXaf } from "@/lib/money";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const candidate = await prisma.candidate.findUnique({
    where: { slug },
    select: { stageName: true, bio: true, city: true },
  });
  if (!candidate) return { title: "Candidat" };

  const title = `${candidate.stageName} · vote ici`;
  const description =
    candidate.bio?.trim() ||
    `Mon son est en ligne. Vote pour ${candidate.stageName}${
      candidate.city ? ` (${candidate.city})` : ""
    }.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

function phaseLabel(phase: {
  number: number;
  title: string;
  theme: string | null;
}) {
  const episode = getEpisodeByNumber(phase.number);
  if (episode) return `${episode.code} · ${episode.title}`;
  return `E${phase.number} · ${phase.theme ?? phase.title}`;
}

export default async function CandidatePage({ params }: Props) {
  const { slug } = await params;
  const candidate = await prisma.candidate.findUnique({ where: { slug } });
  if (!candidate) notFound();

  const season = await getActiveSeason();
  const phase = season ? await getCurrentPhase(season.id) : null;
  const packages = season?.packages ?? [];
  const fan = await getFanSession();
  const candidateSession = await getCandidateSession();
  const isOwner = candidateSession?.id === candidate.id;

  const entry = phase
    ? await prisma.phaseEntry.findUnique({
        where: {
          phaseId_candidateId: {
            phaseId: phase.id,
            candidateId: candidate.id,
          },
        },
        include: {
          _count: { select: { juryScores: true } },
        },
      })
    : null;

  const seasonEntries = season
    ? await prisma.phaseEntry.findMany({
        where: {
          candidateId: candidate.id,
          phase: { seasonId: season.id },
        },
        include: {
          phase: true,
          _count: { select: { juryScores: true } },
        },
        orderBy: { phase: { number: "asc" } },
      })
    : [];

  let currentScore: CompetitionPhaseScore | null = null;
  const history: CompetitionPhaseScore[] = [];

  if (season && seasonEntries.length > 0) {
    const uniquePhaseIds = [...new Set(seasonEntries.map((e) => e.phaseId))];
    const fieldsByPhase = new Map<
      string,
      Awaited<ReturnType<typeof getPhaseEntries>>
    >();
    await Promise.all(
      uniquePhaseIds.map(async (phaseId) => {
        fieldsByPhase.set(phaseId, await getPhaseEntries(phaseId));
      }),
    );

    for (const se of seasonEntries) {
      const phaseField = fieldsByPhase.get(se.phaseId) ?? [];
      const activeField = phaseField.filter((e) => e.status === "active");
      const maxVotes = getMaxVotes(
        activeField.length > 0 ? activeField : phaseField,
      );
      const ranked = activeField;
      const rankIdx = ranked.findIndex((e) => e.candidateId === candidate.id);
      const built = buildCompetitionScores({
        phaseNumber: se.phase.number,
        phaseLabel: phaseLabel(se.phase),
        entry: {
          phaseId: se.phaseId,
          status: se.status,
          votesCount: se.votesCount,
          juryScore: se.juryScore,
          juryRatedCount: se._count.juryScores,
        },
        maxVotes,
        rank: rankIdx >= 0 ? rankIdx + 1 : null,
        fieldSize: ranked.length,
        juryExpected: EXPECTED_JURY_COUNT,
      });
      history.push(built);
      if (phase && se.phaseId === phase.id) {
        currentScore = built;
      }
    }
  }

  if (phase && entry && !currentScore) {
    const phaseField = await getPhaseEntries(phase.id);
    const activeField = phaseField.filter((e) => e.status === "active");
    const maxVotes = getMaxVotes(
      activeField.length > 0 ? activeField : phaseField,
    );
    const rankIdx = activeField.findIndex((e) => e.candidateId === candidate.id);
    currentScore = buildCompetitionScores({
      phaseNumber: phase.number,
      phaseLabel: phaseLabel(phase),
      entry: {
        phaseId: entry.phaseId,
        status: entry.status,
        votesCount: entry.votesCount,
        juryScore: entry.juryScore,
        juryRatedCount: entry._count.juryScores,
      },
      maxVotes,
      rank: rankIdx >= 0 ? rankIdx + 1 : null,
      fieldSize: activeField.length,
      juryExpected: EXPECTED_JURY_COUNT,
    });
  }

  const tracks = await prisma.phaseTrack.findMany({
    where: { candidateId: candidate.id },
    include: {
      phase: true,
      comments: {
        orderBy: { createdAt: "desc" },
        include: { fan: { select: { id: true, name: true } } },
      },
      likes: fan
        ? { where: { fanId: fan.id }, select: { id: true } }
        : false,
      _count: { select: { likes: true } },
    },
    orderBy: { phase: { number: "asc" } },
  });

  return (
    <main className="shell candidate-hero">
      <BackNav />

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
              <p className="muted">Votes cumulés</p>
              <strong>{formatVotes(candidate.totalVotes)}</strong>
            </div>
            <div>
              <p className="muted">Gains artiste</p>
              <strong>{formatXaf(candidate.totalEarnedXaf)}</strong>
            </div>
            {currentScore?.rank ? (
              <div>
                <p className="muted">Rang phase</p>
                <strong>#{currentScore.rank}</strong>
              </div>
            ) : null}
          </div>
          {phase ? (
            <p className="muted">
              Phase {phase.number} · {phase.theme ?? phase.title}
            </p>
          ) : null}
        </div>
      </section>

      <CompetitionScoreboard
        stageName={candidate.stageName}
        current={currentScore}
        history={history}
      />

      {phase && entry?.status === "active" && phase.votesOpen ? (
        <VoteForm
          candidateId={candidate.id}
          candidateName={candidate.stageName}
          phaseId={phase.id}
          packages={packages}
          freeVotes={fan?.freeVotes ?? 0}
          fanName={fan?.name}
          fanPhone={fan?.phone}
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

      <section id="discographie" className="music-parcours">
        <div className="section-head">
          <div>
            <p className="muted">Discographie</p>
            <h2>Parcours musical</h2>
          </div>
        </div>

        {tracks.length === 0 ? (
          <p className="muted">
            Aucun son publié pour le moment.
          </p>
        ) : (
          <div className="track-list">
            {tracks.map((track) => (
              <article key={track.id} className="track-card">
                <TrackListenCard
                  trackId={track.id}
                  title={track.title ?? `Son phase ${track.phase.number}`}
                  phaseLabel={`E${track.phase.number} · ${track.phase.theme ?? track.phase.title}`}
                  audioUrl={track.audioUrl}
                  lyrics={track.lyrics}
                  playCount={track.playCount}
                  downloadCount={track.downloadCount}
                  likeCount={track._count.likes}
                  likedByFan={
                    Array.isArray(track.likes) ? track.likes.length > 0 : false
                  }
                  fanLoggedIn={Boolean(fan)}
                  candidateSlug={candidate.slug}
                  candidateName={candidate.stageName}
                  candidatePhotoUrl={candidate.photoUrl}
                />
                <TrackComments
                  trackId={track.id}
                  fan={fan ? { id: fan.id, name: fan.name } : null}
                  isOwner={isOwner}
                  comments={track.comments.map((c) => ({
                    id: c.id,
                    body: c.body,
                    createdAt: c.createdAt.toISOString(),
                    likedByArtist: c.likedByArtist,
                    fan: { id: c.fan.id, name: c.fan.name },
                  }))}
                />
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
