"use client";

import { useEffect, useState } from "react";
import { formatDoualaClock } from "@/lib/submission-deadline";

type Props = {
  unlockAt: string;
  message?: string | null;
  compact?: boolean;
};

export function TrackLockOverlay({ unlockAt, message, compact }: Props) {
  const [label, setLabel] = useState(() =>
    formatDoualaClock(new Date(unlockAt)),
  );
  const [locked, setLocked] = useState(() => Date.now() < new Date(unlockAt).getTime());

  useEffect(() => {
    function tick() {
      const at = new Date(unlockAt);
      setLabel(formatDoualaClock(at));
      setLocked(Date.now() < at.getTime());
    }
    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, [unlockAt]);

  if (!locked) return null;

  return (
    <div
      className={
        compact ? "track-lock-overlay is-compact" : "track-lock-overlay"
      }
      role="status"
    >
      <span className="track-lock-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
          <path
            d="M7 11V8a5 5 0 0 1 10 0v3"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <rect
            x="5"
            y="11"
            width="14"
            height="10"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      </span>
      <div>
        <strong>{message ?? `Disponible à ${label}`}</strong>
        {!message ? (
          <span className="muted"> Débloqué à {label}</span>
        ) : null}
      </div>
    </div>
  );
}
