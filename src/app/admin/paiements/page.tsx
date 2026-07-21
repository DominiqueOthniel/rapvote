import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatVotes, formatXaf } from "@/lib/money";
import { reconcilePendingVotes } from "@/lib/reconcile-votes";

export const dynamic = "force-dynamic";

async function runReconcile() {
  "use server";
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");
  await reconcilePendingVotes(80);
  revalidatePath("/admin/paiements");
  revalidatePath("/");
  revalidatePath("/classement");
}

export default async function AdminPaymentsPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  // Auto-rattrapage à chaque visite admin.
  const report = await reconcilePendingVotes(40).catch(() => null);

  const transactions = await prisma.transaction.findMany({
    include: { candidate: true, package: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const pendingCount = transactions.filter((tx) => tx.status === "pending").length;

  return (
    <main>
      <h1 className="page-title">Paiements</h1>
      <p className="muted">
        Orange Money · MTN Money · Split 50/50. Dès qu&apos;un paiement est
        complete chez Notch, les votes sont crédités automatiquement.
      </p>

      <div className="admin-card" style={{ marginTop: "1.25rem" }}>
        <p className="muted">
          Pending: <strong>{pendingCount}</strong>
          {report
            ? ` · dernier scan: ${report.scanned} · crédités: ${report.credited}`
            : null}
        </p>
        <form action={runReconcile} style={{ marginTop: "0.75rem" }}>
          <button className="btn-primary" type="submit">
            Forcer la synchro Notch → votes
          </button>
        </form>
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          Webhook Notch requis:{" "}
          <code>/api/webhooks/notchpay</code> (events payment.complete)
        </p>
      </div>

      <div className="admin-card" style={{ marginTop: "1.5rem" }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Réf</th>
                <th>Notch</th>
                <th>Artiste</th>
                <th>Votant</th>
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
                  <td className="muted">{tx.campayRef ?? "—"}</td>
                  <td>{tx.candidate.stageName}</td>
                  <td>{tx.voterName?.trim() || "—"}</td>
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
