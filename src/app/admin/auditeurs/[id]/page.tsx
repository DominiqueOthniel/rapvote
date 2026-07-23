import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatVotes, formatXaf } from "@/lib/money";

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

function trackLabel(
  track: { title: string | null; phase: { number: number }; candidate: { stageName: string } },
) {
  const title = track.title?.trim() || `Phase ${track.phase.number}`;
  return `${track.candidate.stageName} · ${title}`;
}

const trackInclude = {
  candidate: { select: { id: true, stageName: true, slug: true } },
  phase: { select: { number: true } },
} as const;

export default async function AdminAuditeurDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const { id } = await params;

  const fan = await prisma.fan.findUnique({
    where: { id },
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
  if (!fan) notFound();

  const [streams, downloads, likes, comments, freeVotes, paidVotes] =
    await Promise.all([
      prisma.trackPlayEvent.findMany({
        where: { fanId: fan.id },
        include: { track: { include: trackInclude } },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.trackDownloadEvent.findMany({
        where: { fanId: fan.id },
        include: { track: { include: trackInclude } },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.trackLike.findMany({
        where: { fanId: fan.id },
        include: { track: { include: trackInclude } },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.trackComment.findMany({
        where: { fanId: fan.id },
        include: { track: { include: trackInclude } },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.transaction.findMany({
        where: {
          voterPhone: fan.phone,
          operator: "FREE",
          status: "paid",
        },
        include: { candidate: { select: { stageName: true, slug: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.transaction.findMany({
        where: {
          voterPhone: fan.phone,
          operator: { not: "FREE" },
          status: "paid",
        },
        include: { candidate: { select: { stageName: true, slug: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

  return (
    <main>
      <p className="muted" style={{ marginBottom: "0.75rem" }}>
        <Link href="/admin/auditeurs">← Auditeurs</Link>
      </p>
      <h1 className="page-title">{fan.name}</h1>
      <p className="muted">
        {fan.phone} · inscrit le {formatWhen(fan.createdAt)}
        {fan.streakCount > 0
          ? ` · streak ${fan.streakCount}${fan.streakBadgeEarned ? " · badge" : ""}`
          : ""}
      </p>

      <div className="stats-grid" style={{ marginTop: "1.25rem" }}>
        <div className="stat-card">
          <span className="muted">Streams</span>
          <strong>{formatVotes(fan._count.playEvents)}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Likes</span>
          <strong>{formatVotes(fan._count.likes)}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Commentaires</span>
          <strong>{formatVotes(fan._count.comments)}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Téléchargements</span>
          <strong>{formatVotes(fan._count.downloadEvents)}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Votes gratuits (solde)</span>
          <strong>{formatVotes(fan.freeVotes)}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Votes gratuits utilisés</span>
          <strong>{formatVotes(freeVotes.reduce((s, t) => s + t.votesCount, 0))}</strong>
        </div>
      </div>

      <section className="admin-card" style={{ marginTop: "1.5rem" }}>
        <h2 className="admin-form-title">Streams</h2>
        <p className="muted">Qui cet auditeur écoute (100 derniers).</p>
        <div className="table-wrap" style={{ marginTop: "0.75rem" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Artiste / son</th>
              </tr>
            </thead>
            <tbody>
              {streams.length === 0 ? (
                <tr>
                  <td colSpan={2} className="muted">
                    Aucun stream enregistré.
                  </td>
                </tr>
              ) : (
                streams.map((event) => (
                  <tr key={event.id}>
                    <td className="muted">{formatWhen(event.createdAt)}</td>
                    <td>
                      <Link href={`/candidats/${event.track.candidate.slug}`}>
                        {trackLabel(event.track)}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card" style={{ marginTop: "1.25rem" }}>
        <h2 className="admin-form-title">Likes</h2>
        <p className="muted">Sons likés par cet auditeur.</p>
        <div className="table-wrap" style={{ marginTop: "0.75rem" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Artiste / son</th>
              </tr>
            </thead>
            <tbody>
              {likes.length === 0 ? (
                <tr>
                  <td colSpan={2} className="muted">
                    Aucun like.
                  </td>
                </tr>
              ) : (
                likes.map((like) => (
                  <tr key={like.id}>
                    <td className="muted">{formatWhen(like.createdAt)}</td>
                    <td>
                      <Link href={`/candidats/${like.track.candidate.slug}`}>
                        {trackLabel(like.track)}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card" style={{ marginTop: "1.25rem" }}>
        <h2 className="admin-form-title">Commentaires</h2>
        <p className="muted">Commentaires laissés sur les sons.</p>
        <div className="table-wrap" style={{ marginTop: "0.75rem" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Artiste / son</th>
                <th>Commentaire</th>
              </tr>
            </thead>
            <tbody>
              {comments.length === 0 ? (
                <tr>
                  <td colSpan={3} className="muted">
                    Aucun commentaire.
                  </td>
                </tr>
              ) : (
                comments.map((comment) => (
                  <tr key={comment.id}>
                    <td className="muted">{formatWhen(comment.createdAt)}</td>
                    <td>
                      <Link href={`/candidats/${comment.track.candidate.slug}`}>
                        {trackLabel(comment.track)}
                      </Link>
                    </td>
                    <td>
                      {comment.body}
                      {comment.likedByArtist ? (
                        <div className="muted">Aimé par l&apos;artiste</div>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card" style={{ marginTop: "1.25rem" }}>
        <h2 className="admin-form-title">Téléchargements</h2>
        <p className="muted">Sons téléchargés par cet auditeur (connecté).</p>
        <div className="table-wrap" style={{ marginTop: "0.75rem" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Artiste / son</th>
              </tr>
            </thead>
            <tbody>
              {downloads.length === 0 ? (
                <tr>
                  <td colSpan={2} className="muted">
                    Aucun téléchargement attribué.
                  </td>
                </tr>
              ) : (
                downloads.map((event) => (
                  <tr key={event.id}>
                    <td className="muted">{formatWhen(event.createdAt)}</td>
                    <td>
                      <Link href={`/candidats/${event.track.candidate.slug}`}>
                        {trackLabel(event.track)}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card" style={{ marginTop: "1.25rem" }}>
        <h2 className="admin-form-title">Votes gratuits (1 XAF)</h2>
        <p className="muted">Votes gratuits utilisés pour quel artiste.</p>
        <div className="table-wrap" style={{ marginTop: "0.75rem" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Artiste</th>
                <th>Votes</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              {freeVotes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">
                    Aucun vote gratuit utiliséé.
                  </td>
                </tr>
              ) : (
                freeVotes.map((tx) => (
                  <tr key={tx.id}>
                    <td className="muted">{formatWhen(tx.createdAt)}</td>
                    <td>
                      <Link href={`/candidats/${tx.candidate.slug}`}>
                        {tx.candidate.stageName}
                      </Link>
                    </td>
                    <td>{formatVotes(tx.votesCount)}</td>
                    <td>{formatXaf(tx.amountXaf)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card" style={{ marginTop: "1.25rem" }}>
        <h2 className="admin-form-title">Votes payants</h2>
        <p className="muted">Transactions payées liées à ce numéro (50 derniers).</p>
        <div className="table-wrap" style={{ marginTop: "0.75rem" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Artiste</th>
                <th>Opérateur</th>
                <th>Votes</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              {paidVotes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    Aucun vote payant.
                  </td>
                </tr>
              ) : (
                paidVotes.map((tx) => (
                  <tr key={tx.id}>
                    <td className="muted">{formatWhen(tx.createdAt)}</td>
                    <td>
                      <Link href={`/candidats/${tx.candidate.slug}`}>
                        {tx.candidate.stageName}
                      </Link>
                    </td>
                    <td>{tx.operator}</td>
                    <td>{formatVotes(tx.votesCount)}</td>
                    <td>{formatXaf(tx.amountXaf)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
