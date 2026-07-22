"use client";

import Image from "next/image";
import Link from "next/link";
import { useId } from "react";
import { formatVotes } from "@/lib/money";
import { formatJuryNote } from "@/lib/jury-score";

export type ArtistCardData = {
  slug: string;
  stageName: string;
  city: string | null;
  bio: string | null;
  photoUrl: string | null;
  votesCount?: number;
  juryScore?: number;
  juryRatedCount?: number;
  trackCount?: number;
  rank?: number;
  eliminated?: boolean;
};

type Props = {
  artists: ArtistCardData[];
};

function WaveMark() {
  return (
    <svg
      className="artist-disco-wave"
      viewBox="0 0 24 12"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="1" y="4.5" width="1.6" height="3" rx="0.6" fill="currentColor" />
      <rect x="4.2" y="2.5" width="1.6" height="7" rx="0.6" fill="currentColor" />
      <rect x="7.4" y="1" width="1.6" height="10" rx="0.6" fill="currentColor" />
      <rect x="10.6" y="3" width="1.6" height="6" rx="0.6" fill="currentColor" />
      <rect x="13.8" y="1.5" width="1.6" height="9" rx="0.6" fill="currentColor" />
      <rect x="17" y="3.5" width="1.6" height="5" rx="0.6" fill="currentColor" />
      <rect x="20.2" y="2" width="1.6" height="8" rx="0.6" fill="currentColor" />
    </svg>
  );
}

function CrownMark() {
  const uid = useId().replace(/:/g, "");
  const goldId = `crownGold-${uid}`;
  const shineId = `crownShine-${uid}`;

  return (
    <svg
      className="artist-crown-svg"
      viewBox="0 0 64 40"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={goldId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff6b0" />
          <stop offset="35%" stopColor="#ffd24a" />
          <stop offset="70%" stopColor="#f0a818" />
          <stop offset="100%" stopColor="#ffe27a" />
        </linearGradient>
        <linearGradient id={shineId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="45%" stopColor="rgba(255,255,255,0.85)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${goldId})`}
        d="M6 30 L10 12 L22 24 L32 6 L42 24 L54 12 L58 30 Z"
      />
      <rect
        x="6"
        y="30"
        width="52"
        height="6"
        rx="1.5"
        fill={`url(#${goldId})`}
      />
      <circle cx="10" cy="12" r="2.4" fill="#fff4c4" />
      <circle cx="32" cy="6" r="2.8" fill="#fff8d6" />
      <circle cx="54" cy="12" r="2.4" fill="#fff4c4" />
      <rect
        className="artist-crown-shine"
        x="6"
        y="8"
        width="18"
        height="28"
        fill={`url(#${shineId})`}
        opacity="0.7"
      />
    </svg>
  );
}

export function ArtistCards({ artists }: Props) {
  return (
    <div className="artist-grid">
      {artists.map((artist, index) => {
        const wasted = artist.eliminated === true;
        const tracks = artist.trackCount ?? 0;
        const profileHref = `/candidats/${artist.slug}`;
        const discoHref = `${profileHref}#discographie`;
        const juryPending = (artist.juryRatedCount ?? 0) === 0;
        const hasJuryField = typeof artist.juryScore === "number";
        const isLeader = artist.rank === 1 && !wasted;

        return (
          <article
            key={artist.slug}
            className={[
              "artist-card",
              wasted ? "artist-card-wasted" : "",
              isLeader ? "is-leader" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <Link
              href={profileHref}
              className="artist-card-media"
              aria-label={`Profil de ${artist.stageName}`}
            >
              {isLeader ? (
                <span className="artist-crown" title="En tête du classement">
                  <CrownMark />
                </span>
              ) : null}
              {artist.photoUrl ? (
                <Image
                  src={artist.photoUrl}
                  alt={artist.stageName}
                  fill
                  sizes="(max-width: 699px) 100vw, (max-width: 959px) 50vw, 33vw"
                  className="artist-card-img"
                  priority={index < 3}
                />
              ) : (
                <div className="artist-card-fallback">
                  {artist.stageName.slice(0, 2)}
                </div>
              )}
              <div className="artist-card-shade" />
              {wasted ? (
                <div className="artist-card-wasted-overlay" aria-hidden="true">
                  <span className="artist-card-wasted-x">✕</span>
                  <span className="artist-card-wasted-label">WASTED</span>
                </div>
              ) : null}
              {typeof artist.rank === "number" && !wasted ? (
                <span
                  className={
                    isLeader ? "artist-card-rank is-leader-rank" : "artist-card-rank"
                  }
                >
                  #{artist.rank}
                </span>
              ) : null}
              {hasJuryField && !wasted ? (
                <span
                  className={
                    juryPending
                      ? "artist-card-jury-badge is-pending"
                      : "artist-card-jury-badge"
                  }
                >
                  {juryPending
                    ? "Note jury · —"
                    : `Note ${formatJuryNote(artist.juryScore as number)}`}
                </span>
              ) : null}
              {!wasted && tracks > 0 ? (
                <span className="artist-card-tracks-badge">
                  {tracks} son{tracks > 1 ? "s" : ""}
                </span>
              ) : null}
            </Link>

            <div className="artist-card-body">
              <div className="artist-card-meta">
                <h3>
                  <Link href={profileHref}>{artist.stageName}</Link>
                </h3>
                {artist.city ? <span>{artist.city}</span> : null}
              </div>
              <p>
                {wasted
                  ? "Éliminé de la compétition."
                  : (artist.bio ?? "En compétition sur ForTheCulture.")}
              </p>

              <div className="artist-card-actions">
                <Link
                  href={discoHref}
                  className={
                    wasted
                      ? "artist-disco-link artist-disco-link-muted"
                      : "artist-disco-link"
                  }
                >
                  <WaveMark />
                  <span>
                    {tracks > 0
                      ? "Voir discographie"
                      : "Ouvrir discographie"}
                  </span>
                </Link>

                <div className="artist-card-foot">
                  <div className="artist-card-stats">
                    {typeof artist.votesCount === "number" ? (
                      <strong>{formatVotes(artist.votesCount)} votes</strong>
                    ) : (
                      <strong>Profil</strong>
                    )}
                    {hasJuryField ? (
                      <span className="artist-card-jury-line">
                        {juryPending
                          ? "Jury en attente"
                          : `Jury ${formatJuryNote(artist.juryScore as number)}`}
                      </span>
                    ) : null}
                  </div>
                  <Link
                    href={profileHref}
                    className={
                      wasted
                        ? "artist-card-cta artist-card-cta-wasted"
                        : "artist-card-cta"
                    }
                  >
                    {wasted ? "Wasted" : "Voter"}
                  </Link>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
