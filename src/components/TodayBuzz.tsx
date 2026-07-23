"use client";

import { useEffect, useState } from "react";
import { formatVotes } from "@/lib/money";

export type BuzzState = {
  playsToday: number;
  likesToday: number;
  playsTotal: number;
  likesTotal: number;
  byTrack: Record<string, { plays: number; likes: number }>;
};

export function useTodayBuzz(
  phaseId: string | null | undefined,
  trackIds: string[],
) {
  const [buzz, setBuzz] = useState<BuzzState>({
    playsToday: 0,
    likesToday: 0,
    playsTotal: 0,
    likesTotal: 0,
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
          playsTotal: data.playsTotal ?? 0,
          likesTotal: data.likesTotal ?? 0,
          byTrack: data.byTrack ?? {},
        });
      } catch {
        // ignore poll errors
      }
    }

    void load();
    const id = window.setInterval(() => void load(), 45000);
    let refreshTimer: number | null = null;
    function onRefresh() {
      if (refreshTimer != null) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => void load(), 1200);
    }
    window.addEventListener("ftc:buzz-refresh", onRefresh);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      if (refreshTimer != null) window.clearTimeout(refreshTimer);
      window.removeEventListener("ftc:buzz-refresh", onRefresh);
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
      <div className="today-buzz-cols">
        <div>
          <p className="today-buzz-label">Aujourd&apos;hui sur la scène</p>
          <p className="today-buzz-stats">
            <strong>{formatVotes(buzz.playsToday)}</strong> écoutes
            <span className="muted"> · </span>
            <strong>{formatVotes(buzz.likesToday)}</strong> likes
          </p>
        </div>
        <div>
          <p className="today-buzz-label">Total</p>
          <p className="today-buzz-stats">
            <strong>{formatVotes(buzz.playsTotal)}</strong> écoutes
            <span className="muted"> · </span>
            <strong>{formatVotes(buzz.likesTotal)}</strong> likes
          </p>
        </div>
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
