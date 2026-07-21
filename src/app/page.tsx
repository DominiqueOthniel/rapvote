import Link from "next/link";
import { FanLoginForm } from "@/components/FanLoginForm";
import { FanLogoutButton } from "@/components/FanLogoutButton";
import { SonsFeed } from "@/components/SonsFeed";
import { getFanSession } from "@/lib/auth";
import {
  getActiveSeason,
  getCurrentPhase,
  getPhaseTracksFeed,
} from "@/lib/competition";
import { getEpisodeByNumber } from "@/lib/parcours";

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
  const phase = await getCurrentPhase(season.id);
  const episode = phase ? getEpisodeByNumber(phase.number) : null;
  const phaseLabel = episode
    ? `${episode.code} · ${episode.title}`
    : phase
      ? `Phase ${phase.number} · ${phase.theme ?? phase.title}`
      : "Phase";

  if (!fan) {
    return (
      <main className="shell section sons-gate">
        <div className="sons-gate-card admin-card">
          <p className="muted">{phaseLabel}</p>
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

  const rawTracks = phase
    ? await getPhaseTracksFeed(phase.id, fan.id)
    : [];

  const tracks = rawTracks.map((t) => ({
    id: t.id,
    title: t.title?.trim() || `Son · ${t.candidate.stageName}`,
    audioUrl: t.audioUrl,
    playCount: t.playCount,
    likeCount: t._count.likes,
    likedByFan: Array.isArray(t.likes) ? t.likes.length > 0 : false,
    candidate: {
      slug: t.candidate.slug,
      stageName: t.candidate.stageName,
      photoUrl: t.candidate.photoUrl,
    },
    phaseLabel,
  }));

  return (
    <main className="shell section sons-home">
      <div className="sons-home-head">
        <div>
          <p className="muted">{phaseLabel}</p>
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

      <SonsFeed tracks={tracks} fanLoggedIn />
    </main>
  );
}
