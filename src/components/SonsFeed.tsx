"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { HeartLikeButton } from "@/components/HeartLikeButton";
import {
  useFanPlayer,
  type FanPlayerTrack,
} from "@/components/FanPlayerProvider";
import { formatVotes } from "@/lib/money";

export type SonsFeedItem = {
  id: string;
  title: string;
  audioUrl: string;
  playCount: number;
  likeCount: number;
  likedByFan: boolean;
  candidate: {
    slug: string;
    stageName: string;
    photoUrl: string | null;
  };
  phaseLabel: string;
};

type Props = {
  tracks: SonsFeedItem[];
  fanLoggedIn: boolean;
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
  };
}

export function SonsFeed({ tracks, fanLoggedIn }: Props) {
  const router = useRouter();
  const { track, isPlaying, playTrack, toggle } = useFanPlayer();
  const [likes, setLikes] = useState(() =>
    Object.fromEntries(tracks.map((t) => [t.id, t.likeCount])),
  );
  const [likedMap, setLikedMap] = useState(() =>
    Object.fromEntries(tracks.map((t) => [t.id, t.likedByFan])),
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const queue = tracks.map(toPlayerTrack);

  function onRowPlay(item: SonsFeedItem) {
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
      setBusyId(null);
      router.refresh();
    } catch {
      setHint("Connexion impossible. Réessaie.");
      setBusyId(null);
    }
  }

  if (tracks.length === 0) {
    return (
      <p className="muted">Aucun son publié pour cette phase pour l&apos;instant.</p>
    );
  }

  return (
    <div className="sons-feed">
      <div className="sons-feed-head" aria-hidden="true">
        <span className="sons-col-num">#</span>
        <span className="sons-col-title">Titre</span>
        <span className="sons-col-plays">Écoutes</span>
        <span className="sons-col-like">Like</span>
      </div>

      <ul className="sons-list">
        {tracks.map((item, index) => {
          const active = track?.id === item.id;
          const playing = active && isPlaying;
          const title =
            item.title.trim() || `Son · ${item.candidate.stageName}`;

          return (
            <li key={item.id}>
              <div
                className={`sons-row${active ? " is-active" : ""}${
                  playing ? " is-playing" : ""
                }`}
              >
                <button
                  type="button"
                  className="sons-row-play"
                  onClick={() => onRowPlay(item)}
                  aria-label={
                    playing ? `Pause ${title}` : `Écouter ${title}`
                  }
                >
                  <span className="sons-col-num">
                    {playing ? "❚❚" : active ? "▶" : index + 1}
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
                    <button
                      type="button"
                      className="sons-track-name"
                      onClick={() => onRowPlay(item)}
                    >
                      {title}
                    </button>
                    <Link
                      href={`/candidats/${item.candidate.slug}`}
                      className="sons-artist-name"
                    >
                      {item.candidate.stageName}
                    </Link>
                    <span className="muted sons-phase">{item.phaseLabel}</span>
                  </div>
                </div>

                <span className="sons-col-plays muted">
                  {formatVotes(item.playCount)}
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

      {hint ? <p className="muted track-listen-tip">{hint}</p> : null}
    </div>
  );
}
