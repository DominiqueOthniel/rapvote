import Link from "next/link";
import { FanLoginForm } from "@/components/FanLoginForm";
import { FanLogoutButton } from "@/components/FanLogoutButton";
import { FanHomeTabs } from "@/components/FanHomeTabs";
import { getFanSession } from "@/lib/auth";
import {
  getActiveSeason,
  getCurrentPhase,
  getSeasonTracksFeed,
} from "@/lib/competition";
import { getFanEngagement } from "@/lib/fan-engagement";
import { getEpisodeByNumber } from "@/lib/parcours";
import { getTrackListenState } from "@/lib/submission-deadline";

export const dynamic = "force-dynamic";

function SetupMessage({
  message,
  detail,
}: {
  message: string;
  detail?: string;
}) {
  return (
    <main className="shell section">
      <p className="hero-kicker">ForTheCulture · New Star Punch</p>
      <h1 className="page-title">Configuration requise</h1>
      <p>{message}</p>
      {detail ? (
        <p className="muted" style={{ marginTop: "1rem", wordBreak: "break-word" }}>
          Détail technique : {detail}
        </p>
      ) : null}
      <p className="muted" style={{ marginTop: "1rem" }}>
        Diagnostic :{" "}
        <Link href="/api/health/db" className="btn-ghost">
          /api/health/db
        </Link>
      </p>
    </main>
  );
}

function phaseChipLabel(phase: {
  number: number;
  title: string;
  theme: string | null;
}) {
  const episode = getEpisodeByNumber(phase.number);
  if (episode) return `${episode.code} · ${episode.title}`;
  return `E${phase.number} · ${phase.theme ?? phase.title}`;
}

export default async function HomePage() {
  let season;
  try {
    season = await getActiveSeason();
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Erreur base de données";
    return (
      <SetupMessage
        message="Impossible de joindre la base de données."
        detail={detail}
      />
    );
  }

  if (!season) {
    return (
      <main className="shell section">
        <p className="hero-kicker">ForTheCulture Cameroun</p>
        <h1 className="page-title">La scène arrive</h1>
        <p className="muted">Aucune saison active pour le moment.</p>
      </main>
    );
  }

  const fan = await getFanSession();
  const currentPhase = await getCurrentPhase(season.id);
  const currentEpisode = currentPhase
    ? getEpisodeByNumber(currentPhase.number)
    : null;
  const seasonLabel = season.title;
  const currentLabel = currentEpisode
    ? `${currentEpisode.code} · ${currentEpisode.title}`
    : currentPhase
      ? `Phase ${currentPhase.number} · ${currentPhase.theme ?? currentPhase.title}`
      : seasonLabel;

  if (!fan) {
    return (
      <main className="shell section sons-gate">
        <div className="sons-gate-card admin-card">
          <p className="muted">{currentLabel}</p>
          <h1 className="page-title">Écoute</h1>
          <FanLoginForm />
          <p className="muted" style={{ marginTop: "1.25rem" }}>
            <Link href="/inscription" className="btn-ghost">
              Inscription artiste
            </Link>
            {" · "}
            <Link href="/candidats" className="btn-ghost">
              Candidats
            </Link>
          </p>
        </div>
      </main>
    );
  }

  const rawTracks = await getSeasonTracksFeed(season.id, fan.id);
  const engagement = await getFanEngagement(fan.id);
  const phasesWithTracks = new Set(rawTracks.map((t) => t.phaseId));
  const phaseOptions = season.phases
    .filter((p) => phasesWithTracks.has(p.id))
    .map((p) => ({
      id: p.id,
      label: phaseChipLabel(p),
    }));

  const tracks = rawTracks.map((t) => {
    const listen = getTrackListenState({
      deadline: t.phase.submissionDeadlineAt,
      role: "public",
    });
    return {
      id: t.id,
      title: t.title?.trim() || `Son · ${t.candidate.stageName}`,
      audioUrl: listen.canListen ? t.audioUrl : "",
      playCount: t.playCount,
      likeCount: t._count.likes,
      likedByFan: Array.isArray(t.likes) ? t.likes.length > 0 : false,
      phaseId: t.phaseId,
      phaseLabel: phaseChipLabel(t.phase),
      lyrics: t.lyrics,
      listenUnlockAt: listen.locked
        ? listen.unlockAt?.toISOString() ?? null
        : null,
      listenLockedMessage: listen.message,
      lateSubmission: t.lateSubmission,
      candidate: {
        slug: t.candidate.slug,
        stageName: t.candidate.stageName,
        photoUrl: t.candidate.photoUrl,
      },
    };
  });

  return (
    <main className="shell section sons-home">
      <div className="sons-home-head">
        <div>
          <p className="muted">{seasonLabel}</p>
          <h1 className="page-title">Sons</h1>
          <p className="muted">Salut {fan.name}</p>
        </div>
        <div className="sons-home-actions">
          <Link className="btn-secondary" href="/candidats">
            Candidats
          </Link>
          <FanLogoutButton />
        </div>
      </div>

      <FanHomeTabs
        tracks={tracks}
        phases={phaseOptions}
        activePhaseId={currentPhase?.id ?? null}
        engagement={
          engagement
            ? {
                streakCount: engagement.streakCount,
                freeVotes: engagement.freeVotes,
                streakBadgeEarned: engagement.streakBadgeEarned,
                streamsToReward: engagement.streamsToReward,
              }
            : null
        }
      />
    </main>
  );
}
