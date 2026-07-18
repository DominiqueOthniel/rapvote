import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatVotes, formatXaf } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const transactions = await prisma.transaction.findMany({
    include: { candidate: true, package: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <main>
      <h1 className="page-title">Paiements</h1>
      <p className="muted">Orange Money · MTN Money · Split 50/50</p>

      <div className="admin-card" style={{ marginTop: "1.5rem" }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Réf</th>
                <th>Artiste</th>
                <th>Opérateur</th>
                <th>Votes</th>
                <th>Montant</th>
                <th>Artiste 50%</th>
                <th>Orga 50%</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{tx.reference}</td>
                  <td>{tx.candidate.stageName}</td>
                  <td>{tx.operator}</td>
                  <td>{formatVotes(tx.votesCount)}</td>
                  <td>{formatXaf(tx.amountXaf)}</td>
                  <td>{formatXaf(tx.candidateShareXaf)}</td>
                  <td>{formatXaf(tx.adminShareXaf)}</td>
                  <td>{tx.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
