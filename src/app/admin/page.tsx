import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatVotes, formatXaf } from "@/lib/money";
import {
  getActiveSeason,
  getCurrentPhase,
} from "@/lib/competition";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const season = await getActiveSeason();
  const phase = season ? await getCurrentPhase(season.id) : null;

  const [candidatesCount, paidTx, totals] = await Promise.all([
    prisma.candidate.count({ where: season ? { seasonId: season.id } : undefined }),
    prisma.transaction.findMany({
      where: { status: "paid", ...(phase ? { phaseId: phase.id } : {}) },
    }),
    prisma.transaction.aggregate({
      where: { status: "paid" },
      _sum: {
        amountXaf: true,
        candidateShareXaf: true,
        adminShareXaf: true,
        votesCount: true,
      },
    }),
  ]);

  const phaseVotes = paidTx.reduce((sum, t) => sum + t.votesCount, 0);

  return (
    <main>
      <h1 className="page-title">Dashboard</h1>
      <p className="muted">
        {season?.title ?? "Pas de saison"} ·{" "}
        {phase ? `Phase ${phase.number}` : "Aucune phase"}
      </p>

      <div className="stats-grid" style={{ marginTop: "1.5rem" }}>
        <div className="stat-card">
          <span className="muted">Candidats</span>
          <strong>{candidatesCount}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Votes (saison)</span>
          <strong>{formatVotes(totals._sum.votesCount ?? 0)}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Votes phase</span>
          <strong>{formatVotes(phaseVotes)}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Encaissé</span>
          <strong>{formatXaf(totals._sum.amountXaf ?? 0)}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Part artistes</span>
          <strong>{formatXaf(totals._sum.candidateShareXaf ?? 0)}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Part orga</span>
          <strong>{formatXaf(totals._sum.adminShareXaf ?? 0)}</strong>
        </div>
      </div>
    </main>
  );
}
