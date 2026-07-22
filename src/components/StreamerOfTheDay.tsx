"use client";

import { useEffect, useState } from "react";
import { DAILY_BEST_STREAMER_VOTES } from "@/lib/fan-engagement-constants";
import { formatVotes } from "@/lib/money";

type Leader = {
  fanId: string;
  name: string;
  playCount: number;
  rank: number;
};

type YesterdayWinner = {
  fanId: string;
  name: string;
  playCount: number;
  freeVotesGiven: number;
  dayKey: string;
} | null;

type BoardState = {
  leaders: Leader[];
  yesterdayWinner: YesterdayWinner;
  rewardVotes: number;
};

const EMPTY: BoardState = {
  leaders: [],
  yesterdayWinner: null,
  rewardVotes: DAILY_BEST_STREAMER_VOTES,
};

export function StreamerOfTheDay() {
  const [board, setBoard] = useState<BoardState>(EMPTY);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/tracks/streamer-board", {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok || cancelled) return;
        setBoard({
          leaders: (data.leaders ?? []).slice(0, 3),
          yesterdayWinner: data.yesterdayWinner ?? null,
          rewardVotes: data.rewardVotes ?? DAILY_BEST_STREAMER_VOTES,
        });
      } catch {
        // ignore poll errors
      }
    }

    void load();
    // Temps réel léger: refresh fréquent + events après chaque stream compté.
    const id = window.setInterval(() => void load(), 8000);
    function onRefresh() {
      void load();
    }
    window.addEventListener("ftc:streamer-refresh", onRefresh);
    window.addEventListener("ftc:buzz-refresh", onRefresh);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("ftc:streamer-refresh", onRefresh);
      window.removeEventListener("ftc:buzz-refresh", onRefresh);
    };
  }, []);

  const slots: Array<Leader | null> = [0, 1, 2].map(
    (i) => board.leaders[i] ?? null,
  );

  return (
    <section className="streamer-day" aria-live="polite">
      <div className="streamer-day-head">
        <div>
          <p className="streamer-day-label">Top 3 streamers du jour</p>
          <p className="streamer-day-live">
            <span className="streamer-day-dot" aria-hidden="true" />
            En direct
          </p>
        </div>
        <p className="streamer-day-prize muted">
          #1 à minuit · {board.rewardVotes} votes gratuits
        </p>
      </div>

      <ol className="streamer-day-podium">
        {slots.map((row, index) => {
          const rank = index + 1;
          if (!row) {
            return (
              <li
                key={`empty-${rank}`}
                className={`streamer-day-slot is-empty is-r${rank}`}
              >
                <span className="streamer-day-slot-rank">#{rank}</span>
                <span className="muted">Libre</span>
              </li>
            );
          }
          return (
            <li
              key={row.fanId}
              className={`streamer-day-slot is-r${rank}`}
            >
              <span className="streamer-day-slot-rank">#{rank}</span>
              <div className="streamer-day-slot-body">
                <strong className="streamer-day-slot-name">{row.name}</strong>
                <span className="streamer-day-slot-plays">
                  {formatVotes(row.playCount)} stream
                  {row.playCount > 1 ? "s" : ""}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      {board.yesterdayWinner ? (
        <p className="streamer-day-yest muted">
          Hier · {board.yesterdayWinner.name} (
          {formatVotes(board.yesterdayWinner.playCount)} streams) · +
          {board.yesterdayWinner.freeVotesGiven} votes
        </p>
      ) : null}
    </section>
  );
}
