"use client";

import { useState } from "react";

type Props = {
  liked: boolean;
  busy?: boolean;
  onToggle: () => void;
  labelLiked?: string;
  labelIdle?: string;
  count?: number;
  className?: string;
};

export function HeartLikeButton({
  liked,
  busy,
  onToggle,
  labelLiked = "Retirer le like",
  labelIdle = "Liker",
  count,
  className,
}: Props) {
  const [pop, setPop] = useState(false);

  function handleClick() {
    if (busy) return;
    if (!liked) {
      setPop(false);
      // Force reflow so animation can replay.
      requestAnimationFrame(() => setPop(true));
      window.setTimeout(() => setPop(false), 560);
    }
    onToggle();
  }

  return (
    <button
      type="button"
      className={`heart-like${liked ? " is-liked" : ""}${pop ? " is-pop" : ""}${
        busy ? " is-busy" : ""
      }${className ? ` ${className}` : ""}`}
      onClick={handleClick}
      disabled={busy}
      aria-pressed={liked}
      aria-label={liked ? labelLiked : labelIdle}
      title={liked ? labelLiked : labelIdle}
    >
      <span className="heart-like-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="heart-like-svg">
          <path
            className="heart-like-path"
            d="M12 21s-6.7-4.35-9.33-7.4C.7 11.4.7 8.1 2.8 6.2c2-1.8 4.9-1.4 6.5.4L12 9.1l2.7-2.5c1.6-1.8 4.5-2.2 6.5-.4 2.1 1.9 2.1 5.2.13 7.4C18.7 16.65 12 21 12 21z"
          />
        </svg>
        <span className="heart-like-burst" />
      </span>
      {typeof count === "number" ? (
        <span className="heart-like-count">{count}</span>
      ) : null}
    </button>
  );
}
