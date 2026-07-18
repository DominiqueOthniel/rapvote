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
  rank?: number;
  eliminated?: boolean;
};

type Props = {
  artists: ArtistCardData[];
};

export function ArtistCards({ artists }: Props) {
  return (
    <div className="artist-grid">
      {artists.map((artist, index) => {
        const wasted = artist.eliminated === true;

        return (
          <Link
            key={artist.slug}
            href={`/candidats/${artist.slug}`}
            className={wasted ? "artist-card artist-card-wasted" : "artist-card"}
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <div className="artist-card-media">
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
                <div className="artist-card-fallback">{artist.stageName.slice(0, 2)}</div>
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
            </div>
            <div className="artist-card-body">
              <div className="artist-card-meta">
                <h3>{artist.stageName}</h3>
                {artist.city ? <span>{artist.city}</span> : null}
              </div>
              <p>
                {wasted
                  ? "Éliminé de la compétition."
                  : (artist.bio ?? "En compétition sur RapVote Cameroun.")}
              </p>
              <div className="artist-card-foot">
                {typeof artist.votesCount === "number" ? (
                  <strong>{formatVotes(artist.votesCount)} votes</strong>
                ) : (
                  <strong>Voir le profil</strong>
                )}
                <span className={wasted ? "artist-card-cta artist-card-cta-wasted" : "artist-card-cta"}>
                  {wasted ? "Wasted" : "Voter"}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
