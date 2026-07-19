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
import { formatVotes, formatXaf } from "@/lib/money";
import { deleteCandidatePhotoFile, saveCandidatePhoto } from "@/lib/upload";
import { COMPETITION_BRAND } from "@/lib/parcours";
import { getCandidateBalanceDue, getCandidatePaidOutXaf } from "@/lib/payouts";

export const dynamic = "force-dynamic";

function revalidateCandidateViews(slug: string) {
  revalidatePath("/candidat");
  revalidatePath("/");
  revalidatePath("/classement");
  revalidatePath("/admin/candidats");
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

  const paidOut = await getCandidatePaidOutXaf(candidate.id);
  const balanceDue = await getCandidateBalanceDue(
    candidate.id,
    candidate.totalEarnedXaf,
  );

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
              <span className="muted">Votes phase</span>
              <strong>{formatVotes(entry?.votesCount ?? 0)}</strong>
            </li>
            <li>
              <span className="muted">Note jury</span>
              <strong>
                {entry ? formatJuryNote(entry.juryScore) : "—"}
              </strong>
            </li>
            <li>
              <span className="muted">Votes saison</span>
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
    </main>
  );
}
