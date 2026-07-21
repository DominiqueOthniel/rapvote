import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  destroyCandidateSession,
  getCandidateSession,
  hashPassword,
} from "@/lib/auth";
import { getActiveSeason, getCurrentPhase, uniqueCandidateSlug } from "@/lib/competition";
import { prisma } from "@/lib/db";
import { formatJuryNote } from "@/lib/scoring";
import { formatVotes, formatXaf, normalizeCameroonPhone } from "@/lib/money";
import {
  deleteCandidatePhotoFile,
  deletePhaseAudioFile,
  saveCandidatePhoto,
} from "@/lib/upload";
import { COMPETITION_BRAND } from "@/lib/parcours";
import { getCandidateBalanceDue, getCandidatePaidOutXaf } from "@/lib/payouts";
import { PhaseTrackUploadForm } from "@/components/PhaseTrackUploadForm";
import { WithdrawalRequestForm } from "@/components/WithdrawalRequestForm";

export const dynamic = "force-dynamic";

function revalidateCandidateViews(slug: string) {
  revalidatePath("/candidat");
  revalidatePath("/");
  revalidatePath("/classement");
  revalidatePath("/admin/candidats");
  revalidatePath("/admin/versements");
  revalidatePath("/admin");
  revalidatePath(`/candidats/${slug}`);
}

async function updateProfile(formData: FormData) {
  "use server";
  const session = await getCandidateSession();
  if (!session) redirect("/candidat/login");

  const stageName = String(formData.get("stageName") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const removePhoto = formData.get("removePhoto") === "on";
  const newPassword = String(formData.get("newPassword") ?? "");

  if (!stageName) return;

  const existing = await prisma.candidate.findUnique({ where: { id: session.id } });
  if (!existing) return;

  const slug = await uniqueCandidateSlug(stageName, existing.id);
  let photoUrl = existing.photoUrl;

  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    try {
      const nextPhoto = await saveCandidatePhoto(photo, slug);
      if (nextPhoto) {
        await deleteCandidatePhotoFile(existing.photoUrl);
        photoUrl = nextPhoto;
      }
    } catch {
      return;
    }
  } else if (removePhoto) {
    await deleteCandidatePhotoFile(existing.photoUrl);
    photoUrl = null;
  }

  const data: {
    stageName: string;
    slug: string;
    city: string | null;
    bio: string | null;
    phone: string | null;
    photoUrl: string | null;
    passwordHash?: string;
  } = {
    stageName,
    slug,
    city: city || null,
    bio: bio || null,
    phone: phone || null,
    photoUrl,
  };

  if (newPassword.length >= 4) {
    data.passwordHash = await hashPassword(newPassword);
  }

  await prisma.candidate.update({
    where: { id: existing.id },
    data,
  });

  revalidateCandidateViews(slug);
  if (existing.slug !== slug) {
    revalidatePath(`/candidats/${existing.slug}`);
  }
}

async function deletePhaseTrack(formData: FormData) {
  "use server";
  const session = await getCandidateSession();
  if (!session) redirect("/candidat/login");

  const trackId = String(formData.get("trackId") ?? "");
  if (!trackId) return;

  const track = await prisma.phaseTrack.findFirst({
    where: { id: trackId, candidateId: session.id },
  });
  if (!track) return;

  await deletePhaseAudioFile(track.audioUrl);
  await prisma.phaseTrack.delete({ where: { id: track.id } });
  revalidateCandidateViews(session.slug);
}

async function requestWithdrawal(formData: FormData) {
  "use server";
  const session = await getCandidateSession();
  if (!session) redirect("/candidat/login");

  const amountXaf = Math.round(Number(formData.get("amountXaf") ?? 0));
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim().slice(0, 400);

  if (!Number.isFinite(amountXaf) || amountXaf < 100) {
    return { ok: false, error: "Montant minimum : 100 XAF." };
  }

  const candidate = await prisma.candidate.findUnique({
    where: { id: session.id },
  });
  if (!candidate) return { ok: false, error: "Profil introuvable." };

  const phone = phoneRaw || candidate.phone || "";
  if (!phone) {
    return {
      ok: false,
      error: "Ajoute un numéro de téléphone pour recevoir le versement.",
    };
  }

  const balance = await getCandidateBalanceDue(
    candidate.id,
    candidate.totalEarnedXaf,
  );
  if (amountXaf > balance) {
    return {
      ok: false,
      error: `Solde insuffisant. Disponible : ${formatXaf(balance)}.`,
    };
  }

  const pendingExists = await prisma.payoutRequest.findFirst({
    where: { candidateId: candidate.id, status: "pending" },
  });
  if (pendingExists) {
    return {
      ok: false,
      error: "Tu as déjà une demande en attente. Attends le traitement admin.",
    };
  }

  await prisma.payoutRequest.create({
    data: {
      candidateId: candidate.id,
      amountXaf,
      phone: normalizeCameroonPhone(phone),
      message: message || null,
      status: "pending",
    },
  });

  if (!candidate.phone && phoneRaw) {
    await prisma.candidate.update({
      where: { id: candidate.id },
      data: { phone: normalizeCameroonPhone(phoneRaw) },
    });
  }

  revalidateCandidateViews(candidate.slug);
  return { ok: true };
}

export default async function CandidateDashboardPage() {
  const session = await getCandidateSession();
  if (!session) redirect("/candidat/login");

  const candidate = await prisma.candidate.findUnique({
    where: { id: session.id },
  });
  if (!candidate) {
    await destroyCandidateSession();
    redirect("/candidat/login");
  }

  const season = await getActiveSeason();
  const phase = season ? await getCurrentPhase(season.id) : null;
  const entry =
    phase
      ? await prisma.phaseEntry.findUnique({
          where: {
            phaseId_candidateId: {
              phaseId: phase.id,
              candidateId: candidate.id,
            },
          },
        })
      : null;

  const phases = season?.phases ?? [];
  const tracks = await prisma.phaseTrack.findMany({
    where: { candidateId: candidate.id },
  });
  const trackByPhase = new Map(tracks.map((t) => [t.phaseId, t]));

  const paidOut = await getCandidatePaidOutXaf(candidate.id);
  const balanceDue = await getCandidateBalanceDue(
    candidate.id,
    candidate.totalEarnedXaf,
  );
  const withdrawalRequests = await prisma.payoutRequest.findMany({
    where: { candidateId: candidate.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const paidVotes = await prisma.transaction.findMany({
    where: { candidateId: candidate.id, status: "paid" },
    orderBy: { paidAt: "desc" },
    take: 40,
    select: {
      id: true,
      voterName: true,
      votesCount: true,
      paidAt: true,
      createdAt: true,
      phase: { select: { number: true, theme: true, title: true } },
    },
  });

  return (
    <main>
      <h1 className="page-title">Mon espace</h1>
      <p className="muted">
        {COMPETITION_BRAND} · Gère ton profil candidat. C&apos;est toi qui
        renseignes tes infos, pas l&apos;admin.
      </p>

      <div className="candidate-dash-grid">
        <section className="admin-card">
          <h2 className="admin-form-title">Statut compétition</h2>
          <ul className="candidate-stats">
            <li>
              <span className="muted">Phase</span>
              <strong>
                {phase
                  ? `${phase.number} · ${phase.theme ?? phase.title}`
                  : "Aucune"}
              </strong>
            </li>
            <li>
              <span className="muted">Statut</span>
              <strong>{entry?.status ?? "en attente"}</strong>
            </li>
            <li>
              <span className="muted">Votes cumulés</span>
              <strong>{formatVotes(candidate.totalVotes)}</strong>
            </li>
            <li>
              <span className="muted">Gains (50%)</span>
              <strong>{formatXaf(candidate.totalEarnedXaf)}</strong>
            </li>
            <li>
              <span className="muted">Déjà versé / en cours</span>
              <strong>{formatXaf(paidOut)}</strong>
            </li>
            <li>
              <span className="muted">Reste à verser</span>
              <strong>{formatXaf(balanceDue)}</strong>
            </li>
          </ul>
          <p style={{ marginTop: "1rem" }}>
            <Link className="btn-ghost" href={`/candidats/${candidate.slug}`}>
              Voir ma page publique
            </Link>
          </p>
        </section>

        <WithdrawalRequestForm
          balanceDue={balanceDue}
          defaultPhone={candidate.phone ?? ""}
          action={requestWithdrawal}
        />

        <section className="admin-card">
          <h2 className="admin-form-title">Mes demandes de retrait</h2>
          {withdrawalRequests.length === 0 ? (
            <p className="muted">Aucune demande pour le moment.</p>
          ) : (
            <ul className="candidate-stats">
              {withdrawalRequests.map((req) => (
                <li key={req.id}>
                  <span className="muted">
                    {new Date(req.createdAt).toLocaleString("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                    {" · "}
                    {req.status}
                  </span>
                  <strong>{formatXaf(req.amountXaf)}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-card candidate-voters">
          <h2 className="admin-form-title">Qui a voté pour toi</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Noms / pseudos des fans après paiement confirmé.
          </p>
          {paidVotes.length === 0 ? (
            <p className="muted">Aucun vote confirmé pour l&apos;instant.</p>
          ) : (
            <ul className="voter-list">
              {paidVotes.map((tx) => {
                const when = tx.paidAt ?? tx.createdAt;
                const phaseLabel = tx.phase
                  ? `Ép. ${tx.phase.number}${
                      tx.phase.theme || tx.phase.title
                        ? ` · ${tx.phase.theme ?? tx.phase.title}`
                        : ""
                    }`
                  : null;
                return (
                  <li key={tx.id} className="voter-row">
                    <div className="voter-main">
                      <strong>{tx.voterName?.trim() || "Fan anonyme"}</strong>
                      <span className="muted">
                        {formatVotes(tx.votesCount)} vote
                        {tx.votesCount > 1 ? "s" : ""}
                        {phaseLabel ? ` · ${phaseLabel}` : ""}
                      </span>
                    </div>
                    <span className="muted voter-when">
                      {new Date(when).toLocaleString("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <form
          action={updateProfile}
          className="admin-card admin-form"
          encType="multipart/form-data"
        >
          <h2 className="admin-form-title">Mon profil</h2>

          {candidate.photoUrl ? (
            <div className="admin-edit-photo">
              <Image
                src={candidate.photoUrl}
                alt={candidate.stageName}
                width={120}
                height={160}
                className="admin-edit-photo-img"
              />
              <label className="field-check">
                <input type="checkbox" name="removePhoto" />
                <span>Supprimer la photo</span>
              </label>
            </div>
          ) : null}

          <label className="field">
            <span>Nom de scène</span>
            <input
              name="stageName"
              required
              defaultValue={candidate.stageName}
            />
          </label>
          <label className="field">
            <span>Email de connexion</span>
            <input
              type="email"
              defaultValue={candidate.email ?? ""}
              disabled
              readOnly
            />
            <span className="field-hint">Identifiant fixe</span>
          </label>
          <label className="field">
            <span>Ville</span>
            <input name="city" defaultValue={candidate.city ?? ""} />
          </label>
          <label className="field">
            <span>Téléphone</span>
            <input name="phone" type="tel" defaultValue={candidate.phone ?? ""} />
          </label>
          <label className="field">
            <span>Photo</span>
            <input
              className="file-input"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
            />
            <span className="field-hint">JPG, PNG ou WebP · max 4 Mo</span>
          </label>
          <label className="field">
            <span>Bio / univers</span>
            <textarea name="bio" rows={4} defaultValue={candidate.bio ?? ""} />
          </label>
          <label className="field">
            <span>Nouveau mot de passe</span>
            <input
              name="newPassword"
              type="password"
              minLength={4}
              placeholder="Laisser vide pour ne pas changer"
              autoComplete="new-password"
            />
          </label>
          <button className="btn-primary" type="submit">
            Enregistrer mon profil
          </button>
        </form>
      </div>

      <section className="admin-card" style={{ marginTop: "1.5rem" }}>
        <h2 className="admin-form-title">Sons par phase</h2>
        <p className="muted">
          Un son par étape, avec lyrics optionnelles. Visible sur ta page
          publique pour lire et écouter en même temps.
        </p>

        <div className="phase-tracks-admin">
          {phases.length === 0 ? (
            <p className="muted">Aucune phase pour le moment.</p>
          ) : (
            phases.map((p) => {
              const track = trackByPhase.get(p.id);
              return (
                <div key={p.id} className="phase-track-row">
                  <div>
                    <strong>
                      E{p.number} · {p.theme ?? p.title}
                    </strong>
                    <p className="muted">
                      {track
                        ? track.lyrics
                          ? "Son en ligne · lyrics OK"
                          : "Son en ligne · sans lyrics"
                        : "Pas encore de son"}
                    </p>
                    {track ? (
                      <audio
                        controls
                        preload="none"
                        src={track.audioUrl}
                        className="phase-audio-player"
                      >
                        Lecteur audio
                      </audio>
                    ) : null}
                  </div>

                  <PhaseTrackUploadForm
                    phaseId={p.id}
                    hasTrack={Boolean(track)}
                    defaultTitle={track?.title}
                    defaultLyrics={track?.lyrics}
                  />

                  {track ? (
                    <form action={deletePhaseTrack}>
                      <input type="hidden" name="trackId" value={track.id} />
                      <button className="btn-ghost" type="submit">
                        Supprimer
                      </button>
                    </form>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
