"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { STREAK_REWARD_DAYS } from "@/lib/fan-engagement-constants";

export type FanEngagementState = {
  streakCount: number;
  freeVotes: number;
  streakBadgeEarned: boolean;
  daysToReward: number;
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
          `Série de ${STREAK_REWARD_DAYS} jours ! +1 vote gratuit`,
        );
        window.setTimeout(() => setFlash(null), 5000);
      }
    }
    window.addEventListener("ftc:fan-engagement", onEngagement);
    return () =>
      window.removeEventListener("ftc:fan-engagement", onEngagement);
  }, []);

  const progress = Math.min(
    STREAK_REWARD_DAYS,
    state.streakCount === 0
      ? 0
      : ((state.streakCount - 1) % STREAK_REWARD_DAYS) + 1,
  );

  return (
    <section className="fan-streak-card" aria-label="Série d'écoute">
      <div className="fan-streak-main">
        <div>
          <p className="muted">Série d&apos;écoute</p>
          <p className="fan-streak-count">
            <strong>{state.streakCount}</strong>
            <span className="muted">
              {" "}
              jour{state.streakCount > 1 ? "s" : ""} d&apos;affilée
            </span>
          </p>
          <p className="muted fan-streak-hint">
            {state.streakCount === 0
              ? `Écoute un son aujourd'hui pour démarrer · récompense à ${STREAK_REWARD_DAYS} jours`
              : progress >= STREAK_REWARD_DAYS
                ? "Objectif atteint. Continue demain pour enchaîner."
                : `${STREAK_REWARD_DAYS - progress} jour${
                    STREAK_REWARD_DAYS - progress > 1 ? "s" : ""
                  } pour le prochain vote gratuit`}
          </p>
        </div>
        <div className="fan-streak-side">
          {state.streakBadgeEarned ? (
            <span className="fan-streak-badge" title="Badge série">
              Badge série
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
        className="fan-streak-meter"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={STREAK_REWARD_DAYS}
      >
        {Array.from({ length: STREAK_REWARD_DAYS }, (_, i) => (
          <span
            key={i}
            className={`fan-streak-pip${i < progress ? " is-on" : ""}`}
          />
        ))}
      </div>
      {flash ? <p className="fan-streak-flash">{flash}</p> : null}
    </section>
  );
}
