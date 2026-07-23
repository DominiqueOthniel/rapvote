"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HeartLikeButton } from "@/components/HeartLikeButton";
import {
  useFanPlayer,
  type FanPlayerTrack,
} from "@/components/FanPlayerProvider";
import {
  TodayBuzzBanner,
  todayTrackBuzz,
  useTodayBuzz,
} from "@/components/TodayBuzz";
import { TrackLockOverlay } from "@/components/TrackLockOverlay";
import { formatVotes } from "@/lib/money";

export type SonsFeedItem = {
  id: string;
  title: string;
  audioUrl: string;
  playCount: number;
  likeCount: number;
  likedByFan: boolean;
  phaseId: string;
  phaseLabel: string;
  lyrics: string | null;
  listenUnlockAt?: string | null;
  listenLockedMessage?: string | null;
  lateSubmission?: boolean;
  candidate: {
    slug: string;
    stageName: string;
    photoUrl: string | null;
  };
};

export type SonsPhaseOption = {
  id: string;
  label: string;
};

type Props = {
  tracks: SonsFeedItem[];
  phases: SonsPhaseOption[];
  fanLoggedIn: boolean;
  activePhaseId?: string | null;
};

function toPlayerTrack(item: SonsFeedItem): FanPlayerTrack {
  return {
    id: item.id,
    title: item.title,
    audioUrl: item.audioUrl,
    candidateSlug: item.candidate.slug,
    candidateName: item.candidate.stageName,
    candidatePhotoUrl: item.candidate.photoUrl,
    likeCount: item.likeCount,
    likedByFan: item.likedByFan,
    lyrics: item.lyrics,
    listenUnlockAt: item.listenUnlockAt,
    listenLockedMessage: item.listenLockedMessage,
  };
}

export function SonsFeed({
  tracks,
  phases,
  fanLoggedIn,
  activePhaseId = null,
}: Props) {
  const router = useRouter();
  const { track, isPlaying, playTrack, toggle, playCounts } = useFanPlayer();
  const [phaseFilter, setPhaseFilter] = useState<string>(
    () => activePhaseId ?? "all",
  );
  const [likes, setLikes] = useState(() =>
    Object.fromEntries(tracks.map((t) => [t.id, t.likeCount])),
  );
  const [likedMap, setLikedMap] = useState(() =>
    Object.fromEntries(tracks.map((t) => [t.id, t.likedByFan])),
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const visible = useMemo(() => {
    if (phaseFilter === "all") return tracks;
    return tracks.filter((t) => t.phaseId === phaseFilter);
  }, [tracks, phaseFilter]);

  const queue = useMemo(() => visible.map(toPlayerTrack), [visible]);
  // "Toutes" = buzz global du jour. Sinon, limité à la phase filtrée.
  const buzzPhaseId = phaseFilter === "all" ? null : phaseFilter;
  const buzzTrackIds = useMemo(
    () =>
      (buzzPhaseId
        ? tracks.filter((t) => t.phaseId === buzzPhaseId)
        : tracks
      ).map((t) => t.id),
    [tracks, buzzPhaseId],
  );
  const buzz = useTodayBuzz(buzzPhaseId, buzzTrackIds);

  function onRowPlay(item: SonsFeedItem) {
    if (
      item.listenUnlockAt &&
      Date.now() < new Date(item.listenUnlockAt).getTime()
    ) {
      setHint(item.listenLockedMessage ?? "Ce son est encore sous cadenas.");
      return;
    }
    if (track?.id === item.id) {
      toggle();
      return;
    }
    playTrack(toPlayerTrack(item), queue);
  }

  async function toggleLike(item: SonsFeedItem) {
    if (!fanLoggedIn) {
      setHint("Connecte-toi pour liker.");
      return;
    }
    setBusyId(item.id);
    setHint(null);
    try {
      const res = await fetch("/api/tracks/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: item.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setHint(data.error ?? "Like impossible");
        setBusyId(null);
        return;
      }
      setLikedMap((prev) => ({ ...prev, [item.id]: Boolean(data.liked) }));
      if (typeof data.likeCount === "number") {
        setLikes((prev) => ({ ...prev, [item.id]: data.likeCount }));
      }
      window.dispatchEvent(new Event("ftc:buzz-refresh"));
      setBusyId(null);
      router.refresh();
    } catch {
      setHint("Connexion impossible. Réessaie.");
      setBusyId(null);
    }
  }

  return (
    <div className="sons-feed">
      <TodayBuzzBanner buzz={buzz} />

      {phases.length > 0 ? (
        <div className="sons-phase-filters" role="tablist" aria-label="Phases">
          <button
            type="button"
            role="tab"
            aria-selected={phaseFilter === "all"}
            className={
              phaseFilter === "all"
                ? "sons-phase-chip is-active"
                : "sons-phase-chip"
            }
            onClick={() => setPhaseFilter("all")}
          >
            Toutes
          </button>
          {phases.map((phase) => (
            <button
              key={phase.id}
              type="button"
              role="tab"
              aria-selected={phaseFilter === phase.id}
              className={
                phaseFilter === phase.id
                  ? "sons-phase-chip is-active"
                  : "sons-phase-chip"
              }
              onClick={() => setPhaseFilter(phase.id)}
            >
              {phase.label}
            </button>
          ))}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <p className="muted">Aucun son pour ce filtre.</p>
      ) : (
        <>
          <div className="sons-feed-head" aria-hidden="true">
            <span className="sons-col-num">#</span>
            <span className="sons-col-title">Titre</span>
            <span className="sons-col-plays">Écoutes</span>
            <span className="sons-col-like">Like</span>
          </div>

          <ul className="sons-list">
            {visible.map((item, index) => {
              const active = track?.id === item.id;
              const playing = active && isPlaying;
              const title =
                item.title.trim() || `Son · ${item.candidate.stageName}`;
              const plays = playCounts[item.id] ?? item.playCount;
              const dayBuzz = todayTrackBuzz(buzz.byTrack, item.id);
              const locked =
                Boolean(item.listenUnlockAt) &&
                Date.now() < new Date(item.listenUnlockAt as string).getTime();

              return (
                <li key={item.id}>
                  <div
                    className={`sons-row${active ? " is-active" : ""}${
                      playing ? " is-playing" : ""
                    }${locked ? " is-locked" : ""}`}
                  >
                    <button
                      type="button"
                      className="sons-row-play"
                      onClick={() => onRowPlay(item)}
                      aria-label={
                        locked
                          ? `Verrouillé ${title}`
                          : playing
                            ? `Pause ${title}`
                            : `Écouter ${title}`
                      }
                    >
                      <span className="sons-col-num">
                        {locked ? "⊘" : playing ? "❚❚" : active ? "▶" : index + 1}
                      </span>
                    </button>

                    <div className="sons-col-title">
                      <Link
                        href={`/candidats/${item.candidate.slug}`}
                        className="sons-cover"
                      >
                        {item.candidate.photoUrl ? (
                          <Image
                            src={item.candidate.photoUrl}
                            alt=""
                            width={48}
                            height={48}
                            className="sons-cover-img"
                          />
                        ) : (
                          <span className="sons-cover-fallback">
                            {item.candidate.stageName.slice(0, 1)}
                          </span>
                        )}
                      </Link>
                      <div className="sons-title-meta">
                        <div className="sons-title-row">
                          <button
                            type="button"
                            className="sons-track-name"
                            onClick={() => onRowPlay(item)}
                          >
                            {title}
                          </button>
                          <span className="sons-plays-beside" title="Écoutes">
                            {formatVotes(plays)}
                          </span>
                        </div>
                        <Link
                          href={`/candidats/${item.candidate.slug}`}
                          className="sons-artist-name"
                        >
                          {item.candidate.stageName}
                        </Link>
                        <span className="muted sons-phase">
                          {item.phaseLabel}
                        </span>
                        {locked && item.listenUnlockAt ? (
                          <TrackLockOverlay
                            unlockAt={item.listenUnlockAt}
                            message={item.listenLockedMessage}
                            compact
                          />
                        ) : null}
                        {dayBuzz.plays > 0 || dayBuzz.likes > 0 ? (
                          <span className="sons-day-buzz">
                            +{formatVotes(dayBuzz.plays)} éc. auj.
                            {dayBuzz.likes > 0
                              ? ` · +${formatVotes(dayBuzz.likes)} likes`
                              : ""}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <span className="sons-col-plays muted">
                      {formatVotes(plays)}
                    </span>

                    <div className="sons-col-like">
                      <HeartLikeButton
                        liked={Boolean(likedMap[item.id])}
                        busy={busyId === item.id}
                        count={likes[item.id] ?? item.likeCount}
                        onToggle={() => void toggleLike(item)}
                        labelLiked="Retirer le like"
                        labelIdle="Liker"
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {hint ? <p className="muted track-listen-tip">{hint}</p> : null}
    </div>
  );
}
