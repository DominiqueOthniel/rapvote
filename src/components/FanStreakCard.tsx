"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { STREAK_REWARD_STREAMS } from "@/lib/fan-engagement-constants";

export type FanEngagementState = {
  streakCount: number;
  freeVotes: number;
  streakBadgeEarned: boolean;
  streamsToReward: number;
  rewardedNow?: boolean;
};

type Props = {
  initial: FanEngagementState;
};

export function FanStreakCard({ initial }: Props) {
  const [state, setState] = useState(initial);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    setState(initial);
  }, [initial]);

  useEffect(() => {
    function onEngagement(event: Event) {
      const detail = (event as CustomEvent<FanEngagementState>).detail;
      if (!detail) return;
      setState(detail);
      if (detail.rewardedNow) {
        setFlash(
          `${STREAK_REWARD_STREAMS} écoutes ! +1 vote gratuit`,
        );
        window.setTimeout(() => setFlash(null), 5000);
      }
    }
    window.addEventListener("ftc:fan-engagement", onEngagement);
    return () =>
      window.removeEventListener("ftc:fan-engagement", onEngagement);
  }, []);

  const inCycle =
    state.streakCount === 0
      ? 0
      : ((state.streakCount - 1) % STREAK_REWARD_STREAMS) + 1;
  const fillPct = Math.round((inCycle / STREAK_REWARD_STREAMS) * 100);

  return (
    <section className="fan-streak-card" aria-label="Écoutes pour vote gratuit">
      <div className="fan-streak-main">
        <div>
          <p className="muted">Écoutes comptées</p>
          <p className="fan-streak-count">
            <strong>{inCycle}</strong>
            <span className="muted"> / {STREAK_REWARD_STREAMS}</span>
          </p>
          <p className="muted fan-streak-hint">
            {state.streakCount === 0
              ? `Écoute un son (~30 s) · 1 vote gratuit tous les ${STREAK_REWARD_STREAMS} streams`
              : inCycle >= STREAK_REWARD_STREAMS
                ? "Objectif atteint. Continue pour le prochain."
                : `${state.streamsToReward} écoute${
                    state.streamsToReward > 1 ? "s" : ""
                  } pour le prochain vote gratuit`}
          </p>
        </div>
        <div className="fan-streak-side">
          {state.streakBadgeEarned ? (
            <span className="fan-streak-badge" title="Badge streams">
              Badge streams
            </span>
          ) : null}
          <span className="fan-streak-free">
            {state.freeVotes} vote{state.freeVotes > 1 ? "s" : ""} gratuit
            {state.freeVotes > 1 ? "s" : ""}
          </span>
          {state.freeVotes > 0 ? (
            <Link href="/candidats" className="btn-secondary">
              Utiliser
            </Link>
          ) : null}
        </div>
      </div>
      <div
        className="fan-streak-meter fan-streak-meter-bar"
        role="progressbar"
        aria-valuenow={inCycle}
        aria-valuemin={0}
        aria-valuemax={STREAK_REWARD_STREAMS}
      >
        <span
          className="fan-streak-meter-fill"
          style={{ width: `${fillPct}%` }}
        />
      </div>
      {flash ? <p className="fan-streak-flash">{flash}</p> : null}
    </section>
  );
}
