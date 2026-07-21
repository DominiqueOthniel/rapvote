import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatXaf, normalizeCameroonPhone } from "@/lib/money";
import {
  createNotchTransfer,
  getNotchTransfer,
  isNotchPayConfigured,
  normalizeNotchStatus,
  resolvePayoutChannel,
} from "@/lib/notchpay";
import {
  getCandidateBalanceDue,
  makePayoutReference,
} from "@/lib/payouts";
import { getActiveSeason } from "@/lib/competition";
import { PayoutForm } from "@/components/PayoutForm";

export const dynamic = "force-dynamic";

function revalidatePayoutViews() {
  revalidatePath("/admin/versements");
  revalidatePath("/admin/paiements");
  revalidatePath("/admin/candidats");
  revalidatePath("/admin");
  revalidatePath("/candidat");
}

async function handlePayoutRequest(formData: FormData) {
  "use server";
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const requestId = String(formData.get("requestId") ?? "");
  const nextStatus = String(formData.get("status") ?? "");
  const adminNote = String(formData.get("adminNote") ?? "").trim().slice(0, 400);

  if (!requestId) return;
  if (nextStatus !== "approved" && nextStatus !== "rejected" && nextStatus !== "paid") {
    return;
  }

  await prisma.payoutRequest.update({
    where: { id: requestId },
    data: {
      status: nextStatus,
      adminNote: adminNote || null,
      handledAt: new Date(),
    },
  });

  revalidatePayoutViews();
}

async function createPayout(formData: FormData) {
  "use server";
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  if (!isNotchPayConfigured()) {
    return {
      ok: false,
      error: "Configure NOTCHPAY_PUBLIC_KEY et NOTCHPAY_PRIVATE_KEY sur Netlify.",
    };
  }

  const candidateId = String(formData.get("candidateId") ?? "");
  const amountXaf = Math.round(Number(formData.get("amountXaf") ?? 0));
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const operatorRaw = String(formData.get("operator") ?? "").trim().toUpperCase();
  const operator =
    operatorRaw === "ORANGE" || operatorRaw === "MTN"
      ? (operatorRaw as "ORANGE" | "MTN")
      : null;

  if (!candidateId) return { ok: false, error: "Choisis un artiste." };
  if (!Number.isFinite(amountXaf) || amountXaf < 100) {
    return { ok: false, error: "Montant minimum : 100 XAF." };
  }

  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) return { ok: false, error: "Artiste introuvable." };

  const phone = phoneRaw || candidate.phone || "";
  if (!phone) {
    return {
      ok: false,
      error: "Le candidat n'a pas de numéro. Ajoute-le ou saisis-en un.",
    };
  }

  const balance = await getCandidateBalanceDue(candidate.id, candidate.totalEarnedXaf);
  if (amountXaf > balance) {
    return {
      ok: false,
      error: `Solde insuffisant. Dû : ${formatXaf(balance)}.`,
    };
  }

  let channel: "cm.mtn" | "cm.orange";
  try {
    channel = resolvePayoutChannel(phone, operator);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Opérateur invalide",
    };
  }

  const reference = makePayoutReference();
  const description = `Versement gains · ${candidate.stageName}`;

  const payout = await prisma.payout.create({
    data: {
      candidateId: candidate.id,
      amountXaf,
      phone: normalizeCameroonPhone(phone),
      channel,
      reference,
      status: "pending",
      description,
    },
  });

  try {
    const transfer = await createNotchTransfer({
      amountXaf,
      phone,
      name: candidate.stageName,
      email: candidate.email,
      channel,
      reference,
      description,
    });

    const status = normalizeNotchStatus(transfer.status);
    await prisma.payout.update({
      where: { id: payout.id },
      data: {
        notchId: transfer.id,
        status,
        completedAt: status === "complete" ? new Date() : null,
      },
    });
  } catch (error) {
    await prisma.payout.update({
      where: { id: payout.id },
      data: {
        status: "failed",
        failureReason: error instanceof Error ? error.message : "Échec Notch Pay",
      },
    });
    revalidatePayoutViews();
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Échec du transfert",
    };
  }

  revalidatePayoutViews();
  return { ok: true };
}

async function refreshPayout(formData: FormData) {
  "use server";
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const payoutId = String(formData.get("payoutId") ?? "");
  if (!payoutId) return;

  const payout = await prisma.payout.findUnique({ where: { id: payoutId } });
  if (!payout) return;

  try {
    const transfer = await getNotchTransfer(payout.notchId ?? payout.reference);
    const status = normalizeNotchStatus(transfer.status);
    await prisma.payout.update({
      where: { id: payout.id },
      data: {
        status,
        notchId: transfer.id || payout.notchId,
        completedAt:
          status === "complete"
            ? payout.completedAt ?? new Date()
            : status === "failed" || status === "canceled"
              ? null
              : payout.completedAt,
        failureReason:
          status === "failed"
            ? transfer.failure_reason ?? payout.failureReason
            : payout.failureReason,
      },
    });
  } catch (error) {
    await prisma.payout.update({
      where: { id: payout.id },
      data: {
        failureReason: error instanceof Error ? error.message : "Refresh impossible",
      },
    });
  }

  revalidatePayoutViews();
}

export default async function AdminVersementsPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const season = await getActiveSeason();
  const candidates = season
    ? await prisma.candidate.findMany({
        where: { seasonId: season.id },
        orderBy: { stageName: "asc" },
      })
    : [];

  const balances = await Promise.all(
    candidates.map(async (c) => ({
      id: c.id,
      due: await getCandidateBalanceDue(c.id, c.totalEarnedXaf),
    })),
  );
  const dueById = Object.fromEntries(balances.map((b) => [b.id, b.due]));

  const payouts = await prisma.payout.findMany({
    include: { candidate: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const payoutRequests = await prisma.payoutRequest.findMany({
    include: { candidate: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 50,
  });
  const pendingRequests = payoutRequests.filter((r) => r.status === "pending");

  const configured = isNotchPayConfigured();
  const options = candidates.map((c) => ({
    id: c.id,
    label: `${c.stageName} · dû ${formatXaf(dueById[c.id] ?? 0)}${
      c.phone ? ` · ${c.phone}` : " · sans numéro"
    }`,
  }));

  return (
    <main>
      <h1 className="page-title">Versements</h1>
      <p className="muted">
        Envoie les gains artistes via Notch Pay (Mobile Money MTN / Orange).
      </p>

      <div className="admin-card" style={{ marginTop: "1.25rem" }}>
        <h2 className="admin-form-title">
          Demandes artistes
          {pendingRequests.length > 0
            ? ` · ${pendingRequests.length} en attente`
            : ""}
        </h2>
        {payoutRequests.length === 0 ? (
          <p className="muted">Aucune demande de retrait pour le moment.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Artiste</th>
                  <th>Montant</th>
                  <th>Téléphone</th>
                  <th>Message</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {payoutRequests.map((req) => (
                  <tr key={req.id}>
                    <td>
                      {new Date(req.createdAt).toLocaleString("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td>{req.candidate.stageName}</td>
                    <td>{formatXaf(req.amountXaf)}</td>
                    <td>{req.phone ?? req.candidate.phone ?? "—"}</td>
                    <td>
                      {req.message || "—"}
                      {req.adminNote ? (
                        <div className="muted">Note : {req.adminNote}</div>
                      ) : null}
                    </td>
                    <td>{req.status}</td>
                    <td>
                      {req.status === "pending" || req.status === "approved" ? (
                        <div className="phase-vote-actions">
                          {req.status === "pending" ? (
                            <>
                              <form action={handlePayoutRequest}>
                                <input type="hidden" name="requestId" value={req.id} />
                                <input type="hidden" name="status" value="approved" />
                                <button className="btn-ghost" type="submit">
                                  Vu / approuvé
                                </button>
                              </form>
                              <form action={handlePayoutRequest}>
                                <input type="hidden" name="requestId" value={req.id} />
                                <input type="hidden" name="status" value="rejected" />
                                <button className="btn-ghost" type="submit">
                                  Refuser
                                </button>
                              </form>
                            </>
                          ) : null}
                          <form action={handlePayoutRequest}>
                            <input type="hidden" name="requestId" value={req.id} />
                            <input type="hidden" name="status" value="paid" />
                            <button className="btn-ghost" type="submit">
                              Marquer payé
                            </button>
                          </form>
                        </div>
                      ) : (
                        <span className="muted">
                          {req.status === "paid" ? "Payé" : req.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!configured ? (
        <div className="admin-card" style={{ marginTop: "1.25rem" }}>
          <p className="error">
            Notch Pay non configuré. Ajoute NOTCHPAY_PUBLIC_KEY et
            NOTCHPAY_PRIVATE_KEY.
          </p>
        </div>
      ) : (
        <div className="admin-card" style={{ marginTop: "1.25rem" }}>
          <p className="muted">
            Si tu vois &quot;IP address not allowed&quot; : ouvre{" "}
            <a href="/api/health/ip" target="_blank" rel="noreferrer">
              /api/health/ip
            </a>
            , copie l&apos;IP, puis ajoute-la sur{" "}
            <a
              href="https://business.notchpay.co/settings/developer/ips"
              target="_blank"
              rel="noreferrer"
            >
              Notch → Developer → IPs
            </a>
            .
          </p>
        </div>
      )}

      <PayoutForm
        candidates={options}
        configured={configured}
        action={createPayout}
      />

      <div className="admin-card" style={{ marginTop: "1.25rem" }}>
        <h2 className="admin-form-title">Historique</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Réf</th>
                <th>Artiste</th>
                <th>Montant</th>
                <th>Canal</th>
                <th>Téléphone</th>
                <th>Statut</th>
                <th>Notch</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id}>
                  <td>{p.reference}</td>
                  <td>{p.candidate.stageName}</td>
                  <td>{formatXaf(p.amountXaf)}</td>
                  <td>{p.channel}</td>
                  <td>{p.phone}</td>
                  <td>
                    {p.status}
                    {p.failureReason ? (
                      <div className="muted">{p.failureReason}</div>
                    ) : null}
                  </td>
                  <td>{p.notchId ?? "—"}</td>
                  <td>
                    {p.status === "pending" || p.status === "processing" ? (
                      <form action={refreshPayout}>
                        <input type="hidden" name="payoutId" value={p.id} />
                        <button className="btn-ghost" type="submit">
                          Rafraîchir
                        </button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
              {payouts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="muted">
                    Aucun versement pour le moment.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
