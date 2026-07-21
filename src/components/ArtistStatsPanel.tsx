"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type { ArtistPhaseStat, ArtistStatsSummary } from "@/lib/artist-stats";
import { formatVotes, formatXaf } from "@/lib/money";

type MetricKey = "plays" | "likes" | "votes" | "revenueXaf";

const METRICS: {
  key: MetricKey;
  label: string;
  color: string;
  format: (n: number) => string;
}[] = [
  {
    key: "plays",
    label: "Écoutes",
    color: "#d6ff3f",
    format: (n) => formatVotes(n),
  },
  {
    key: "likes",
    label: "Likes",
    color: "#ff7a9a",
    format: (n) => formatVotes(n),
  },
  {
    key: "votes",
    label: "Votes",
    color: "#7ad1ff",
    format: (n) => formatVotes(n),
  },
  {
    key: "revenueXaf",
    label: "Revenus",
    color: "#f0c14a",
    format: (n) => formatXaf(n),
  },
];

type Props = {
  stats: ArtistStatsSummary;
};

function maxOf(phases: ArtistPhaseStat[], key: MetricKey) {
  return Math.max(1, ...phases.map((p) => p[key]));
}

export function ArtistStatsPanel({ stats }: Props) {
  const [metric, setMetric] = useState<MetricKey>("plays");
  const active = METRICS.find((m) => m.key === metric) ?? METRICS[0];
  const max = useMemo(
    () => maxOf(stats.phases, metric),
    [stats.phases, metric],
  );

  const width = 560;
  const height = 200;
  const padX = 28;
  const padY = 24;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;
  const n = Math.max(1, stats.phases.length);

  const points = stats.phases.map((phase, i) => {
    const x = padX + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW);
    const ratio = phase[metric] / max;
    const y = padY + chartH - ratio * chartH;
    return { x, y, phase };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padY + chartH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padY + chartH).toFixed(1)} Z`
      : "";

  return (
    <section className="admin-card artist-stats-panel">
      <div className="artist-stats-head">
        <div>
          <h2 className="admin-form-title">Stats par phase</h2>
          <p className="muted">Écoutes, likes, votes et revenus (ta part 50%).</p>
        </div>
      </div>

      <div className="artist-stats-totals">
        <div>
          <span className="muted">Écoutes</span>
          <strong>{formatVotes(stats.totalPlays)}</strong>
        </div>
        <div>
          <span className="muted">Likes</span>
          <strong>{formatVotes(stats.totalLikes)}</strong>
        </div>
        <div>
          <span className="muted">Votes</span>
          <strong>{formatVotes(stats.totalVotes)}</strong>
        </div>
        <div>
          <span className="muted">Revenus</span>
          <strong>{formatXaf(stats.totalRevenueXaf)}</strong>
        </div>
      </div>

      <div className="artist-stats-tabs" role="tablist" aria-label="Métrique">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            role="tab"
            aria-selected={metric === m.key}
            className={`artist-stats-tab${metric === m.key ? " is-active" : ""}`}
            style={{ "--metric": m.color } as CSSProperties}
            onClick={() => setMetric(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {stats.phases.length === 0 ? (
        <p className="muted">Pas encore de données.</p>
      ) : (
        <>
          <div className="artist-stats-chart-wrap">
            <svg
              className="artist-stats-chart"
              viewBox={`0 0 ${width} ${height}`}
              role="img"
              aria-label={`Courbe ${active.label} par phase`}
            >
              {[0.25, 0.5, 0.75, 1].map((g) => {
                const y = padY + chartH - g * chartH;
                return (
                  <line
                    key={g}
                    x1={padX}
                    x2={width - padX}
                    y1={y}
                    y2={y}
                    className="artist-stats-grid"
                  />
                );
              })}
              <path d={areaPath} fill={active.color} opacity={0.14} />
              <path
                d={linePath}
                fill="none"
                stroke={active.color}
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {points.map((p) => (
                <g key={p.phase.phaseId}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={5}
                    fill="#0b0908"
                    stroke={active.color}
                    strokeWidth={2.5}
                  />
                  <text
                    x={p.x}
                    y={height - 6}
                    textAnchor="middle"
                    className="artist-stats-axis"
                  >
                    {p.phase.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <ul className="artist-stats-legend">
            {stats.phases.map((phase) => (
              <li key={phase.phaseId}>
                <span className="muted">{phase.label}</span>
                <strong>{active.format(phase[metric])}</strong>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
