import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatVotes } from "@/lib/money";

export const dynamic = "force-dynamic";

function formatWhen(date: Date) {
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminAuditeursPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const fans = await prisma.fan.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          playEvents: true,
          downloadEvents: true,
          likes: true,
          comments: true,
        },
      },
    },
  });

  const phones = fans.map((f) => f.phone);
  const freeVoteRows =
    phones.length > 0
      ? await prisma.transaction.groupBy({
          by: ["voterPhone"],
          where: {
            operator: "FREE",
            status: "paid",
            voterPhone: { in: phones },
          },
          _sum: { votesCount: true, amountXaf: true },
        })
      : [];

  const freeVotesByPhone = new Map(
    freeVoteRows.map((row) => [
      row.voterPhone,
      {
        votes: row._sum.votesCount ?? 0,
        amountXaf: row._sum.amountXaf ?? 0,
      },
    ]),
  );

  return (
    <main>
      <h1 className="page-title">Auditeurs</h1>
      <p className="muted">
        Fans inscrits, streams, likes, commentaires et téléchargements. Un vote
        gratuit compte 1 XAF.
      </p>

      <div className="stats-grid" style={{ marginTop: "1.25rem" }}>
        <div className="stat-card">
          <span className="muted">Inscrits</span>
          <strong>{formatVotes(fans.length)}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Streams</span>
          <strong>
            {formatVotes(
              fans.reduce((sum, f) => sum + f._count.playEvents, 0),
            )}
          </strong>
        </div>
        <div className="stat-card">
          <span className="muted">Likes</span>
          <strong>
            {formatVotes(fans.reduce((sum, f) => sum + f._count.likes, 0))}
          </strong>
        </div>
        <div className="stat-card">
          <span className="muted">Commentaires</span>
          <strong>
            {formatVotes(fans.reduce((sum, f) => sum + f._count.comments, 0))}
          </strong>
        </div>
        <div className="stat-card">
          <span className="muted">Téléchargements</span>
          <strong>
            {formatVotes(
              fans.reduce((sum, f) => sum + f._count.downloadEvents, 0),
            )}
          </strong>
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: "1.5rem" }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Auditeur</th>
                <th>Inscription</th>
                <th>Streams</th>
                <th>Likes</th>
                <th>Commentaires</th>
                <th>Téléchargements</th>
                <th>Votes gratuits</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {fans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="muted">
                    Aucun auditeur inscrit pour le moment.
                  </td>
                </tr>
              ) : (
                fans.map((fan) => {
                  const freeUsed = freeVotesByPhone.get(fan.phone);
                  return (
                    <tr key={fan.id}>
                      <td>
                        <strong>{fan.name}</strong>
                        <div className="muted">{fan.phone}</div>
                        {fan.streakCount > 0 ? (
                          <div className="muted">
                            Streak {fan.streakCount}
                            {fan.streakBadgeEarned ? " · badge" : ""}
                          </div>
                        ) : null}
                      </td>
                      <td className="muted">{formatWhen(fan.createdAt)}</td>
                      <td>{formatVotes(fan._count.playEvents)}</td>
                      <td>{formatVotes(fan._count.likes)}</td>
                      <td>{formatVotes(fan._count.comments)}</td>
                      <td>{formatVotes(fan._count.downloadEvents)}</td>
                      <td>
                        <div>
                          Solde {formatVotes(fan.freeVotes)}
                        </div>
                        {freeUsed ? (
                          <div className="muted">
                            Utilisés {formatVotes(freeUsed.votes)} ·{" "}
                            {freeUsed.amountXaf} XAF
                          </div>
                        ) : (
                          <div className="muted">Aucun utiliséé</div>
                        )}
                      </td>
                      <td>
                        <Link
                          className="btn-ghost"
                          href={`/admin/auditeurs/${fan.id}`}
                        >
                          Activité
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
