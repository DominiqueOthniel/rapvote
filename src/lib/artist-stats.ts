import { prisma } from "@/lib/db";
import { getEpisodeByNumber } from "@/lib/parcours";

export type ArtistPhaseStat = {
  phaseId: string;
  phaseNumber: number;
  label: string;
  plays: number;
  likes: number;
  votes: number;
  revenueXaf: number;
  hasTrack: boolean;
};

export type ArtistStatsSummary = {
  totalPlays: number;
  totalLikes: number;
  totalVotes: number;
  totalRevenueXaf: number;
  phases: ArtistPhaseStat[];
};

function phaseLabel(phase: {
  number: number;
  title: string;
  theme: string | null;
}) {
  const episode = getEpisodeByNumber(phase.number);
  if (episode) return `${episode.code}`;
  return `E${phase.number}`;
}

export async function getArtistPhaseStats(
  candidateId: string,
  seasonId: string,
): Promise<ArtistStatsSummary> {
  const [phases, tracks, money] = await Promise.all([
    prisma.phase.findMany({
      where: { seasonId },
      orderBy: { number: "asc" },
      select: { id: true, number: true, title: true, theme: true },
    }),
    prisma.phaseTrack.findMany({
      where: { candidateId },
      select: {
        phaseId: true,
        playCount: true,
        _count: { select: { likes: true } },
      },
    }),
    prisma.transaction.groupBy({
      by: ["phaseId"],
      where: { candidateId, status: "paid" },
      _sum: {
        votesCount: true,
        candidateShareXaf: true,
      },
    }),
  ]);

  const trackByPhase = new Map(tracks.map((t) => [t.phaseId, t]));
  const moneyByPhase = new Map(money.map((m) => [m.phaseId, m]));

  const rows: ArtistPhaseStat[] = phases.map((phase) => {
    const track = trackByPhase.get(phase.id);
    const bag = moneyByPhase.get(phase.id);
    return {
      phaseId: phase.id,
      phaseNumber: phase.number,
      label: phaseLabel(phase),
      plays: track?.playCount ?? 0,
      likes: track?._count.likes ?? 0,
      votes: bag?._sum.votesCount ?? 0,
      revenueXaf: bag?._sum.candidateShareXaf ?? 0,
      hasTrack: Boolean(track),
    };
  });

  // Ne garde que les phases avec activité ou son (évite un mur de zéros).
  const active = rows.filter(
    (r) =>
      r.hasTrack || r.plays > 0 || r.likes > 0 || r.votes > 0 || r.revenueXaf > 0,
  );
  const phasesOut = active.length > 0 ? active : rows.slice(0, 1);

  return {
    totalPlays: phasesOut.reduce((s, r) => s + r.plays, 0),
    totalLikes: phasesOut.reduce((s, r) => s + r.likes, 0),
    totalVotes: phasesOut.reduce((s, r) => s + r.votes, 0),
    totalRevenueXaf: phasesOut.reduce((s, r) => s + r.revenueXaf, 0),
    phases: phasesOut,
  };
}
