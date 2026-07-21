"use client";

import { useEffect, useState } from "react";
import { formatVotes } from "@/lib/money";

export type BuzzState = {
  playsToday: number;
  likesToday: number;
  byTrack: Record<string, { plays: number; likes: number }>;
};

export function useTodayBuzz(
  phaseId: string | null | undefined,
  trackIds: string[],
) {
  const [buzz, setBuzz] = useState<BuzzState>({
    playsToday: 0,
    likesToday: 0,
    byTrack: {},
  });

  const trackKey = trackIds.join(",");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const params = new URLSearchParams();
        if (phaseId) params.set("phaseId", phaseId);
        if (trackIds.length > 0) {
          params.set("trackIds", trackIds.slice(0, 80).join(","));
        }
        const res = await fetch(`/api/tracks/today-buzz?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok || cancelled) return;
        setBuzz({
          playsToday: data.playsToday ?? 0,
          likesToday: data.likesToday ?? 0,
          byTrack: data.byTrack ?? {},
        });
      } catch {
        // ignore poll errors
      }
    }

    void load();
    const id = window.setInterval(() => void load(), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
    // trackIds serialized via trackKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseId, trackKey]);

  return buzz;
}

export function TodayBuzzBanner({ buzz }: { buzz: BuzzState }) {
  return (
    <div className="today-buzz-banner" aria-live="polite">
      <span className="today-buzz-pulse" aria-hidden="true" />
      <div>
        <p className="today-buzz-label">Aujourd&apos;hui sur la scène</p>
        <p className="today-buzz-stats">
          <strong>{formatVotes(buzz.playsToday)}</strong> écoutes
          <span className="muted"> · </span>
          <strong>{formatVotes(buzz.likesToday)}</strong> likes
        </p>
      </div>
    </div>
  );
}

export function todayTrackBuzz(
  byTrack: Record<string, { plays: number; likes: number }>,
  trackId: string,
) {
  return byTrack[trackId] ?? { plays: 0, likes: 0 };
}
