"use client";

import Image from "next/image";
import Link from "next/link";
import { formatVotes } from "@/lib/money";

export type ArtistCardData = {
  slug: string;
  stageName: string;
  city: string | null;
  bio: string | null;
  photoUrl: string | null;
  votesCount?: number;
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

export function ArtistCards({ artists }: Props) {
  return (
    <div className="artist-grid">
      {artists.map((artist, index) => {
        const wasted = artist.eliminated === true;
        const tracks = artist.trackCount ?? 0;
        const profileHref = `/candidats/${artist.slug}`;
        const discoHref = `${profileHref}#discographie`;

        return (
          <article
            key={artist.slug}
            className={wasted ? "artist-card artist-card-wasted" : "artist-card"}
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <Link
              href={profileHref}
              className="artist-card-media"
              aria-label={`Profil de ${artist.stageName}`}
            >
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
                <span className="artist-card-rank">#{artist.rank}</span>
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
                  {typeof artist.votesCount === "number" ? (
                    <strong>{formatVotes(artist.votesCount)} votes</strong>
                  ) : (
                    <strong>Profil</strong>
                  )}
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
