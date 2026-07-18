import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Image from "next/image";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uniqueCandidateSlug } from "@/lib/competition";
import { deleteCandidatePhotoFile, saveCandidatePhoto } from "@/lib/upload";
import { DeleteCandidateButton } from "@/components/admin/DeleteCandidateButton";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function revalidateCandidateViews(slug?: string) {
  revalidatePath("/admin/candidats");
  revalidatePath("/");
  revalidatePath("/classement");
  revalidatePath("/admin/phases");
  if (slug) revalidatePath(`/candidats/${slug}`);
}

async function updateCandidate(formData: FormData) {
  "use server";
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const candidateId = String(formData.get("candidateId") ?? "");
  const stageName = String(formData.get("stageName") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const removePhoto = formData.get("removePhoto") === "on";

  if (!candidateId || !stageName) return;

  const existing = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!existing) return;

  const slug = await uniqueCandidateSlug(stageName, candidateId);
  let photoUrl = existing.photoUrl;

  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const nextPhoto = await saveCandidatePhoto(photo, slug);
    if (nextPhoto) {
      await deleteCandidatePhotoFile(existing.photoUrl);
      photoUrl = nextPhoto;
    }
  } else if (removePhoto) {
    await deleteCandidatePhotoFile(existing.photoUrl);
    photoUrl = null;
  }

  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      stageName,
      slug,
      city: city || null,
      bio: bio || null,
      photoUrl,
    },
  });

  revalidateCandidateViews(slug);
  if (existing.slug !== slug) {
    revalidatePath(`/candidats/${existing.slug}`);
  }

  redirect("/admin/candidats");
}

async function deleteCandidate(formData: FormData) {
  "use server";
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const candidateId = String(formData.get("candidateId") ?? "");
  if (!candidateId) return;

  const existing = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!existing) return;

  await deleteCandidatePhotoFile(existing.photoUrl);
  await prisma.candidate.delete({ where: { id: candidateId } });

  revalidateCandidateViews(existing.slug);
  redirect("/admin/candidats");
}

export default async function EditCandidatePage({ params }: Props) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const { id } = await params;
  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) notFound();

  return (
    <main>
      <div className="admin-page-head">
        <div>
          <p className="muted">
            <Link href="/admin/candidats">Candidats</Link>
          </p>
          <h1 className="page-title">Modifier candidat</h1>
        </div>
      </div>

      <form
        action={updateCandidate}
        className="admin-card admin-form"
        encType="multipart/form-data"
      >
        <input type="hidden" name="candidateId" value={candidate.id} />

        {candidate.photoUrl ? (
          <div className="admin-edit-photo">
            <Image
              src={candidate.photoUrl}
              alt={candidate.stageName}
              width={120}
              height={160}
              className="admin-edit-photo-img"
            />
            <label className="field field-check">
              <input name="removePhoto" type="checkbox" />
              <span>Supprimer la photo actuelle</span>
            </label>
          </div>
        ) : null}

        <label className="field">
          <span>Nom de scène</span>
          <input name="stageName" required defaultValue={candidate.stageName} />
        </label>
        <label className="field">
          <span>Ville</span>
          <input name="city" defaultValue={candidate.city ?? ""} />
        </label>
        <label className="field">
          <span>Nouvelle photo</span>
          <input
            className="file-input"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
          />
          <span className="field-hint">Laisse vide pour garder la photo actuelle</span>
        </label>
        <label className="field">
          <span>Bio</span>
          <textarea name="bio" rows={4} defaultValue={candidate.bio ?? ""} />
        </label>
        <p className="muted admin-slug-hint">Slug actuel : {candidate.slug}</p>

        <div className="admin-form-actions">
          <button className="btn-primary" type="submit">
            Enregistrer
          </button>
          <Link className="btn-secondary" href="/admin/candidats">
            Annuler
          </Link>
        </div>
      </form>

      <div className="admin-card admin-danger-zone">
        <h2 className="admin-form-title">Zone danger</h2>
        <p className="muted">
          Supprime le profil, ses entrées de phase, votes et transactions liés.
        </p>
        <DeleteCandidateButton
          action={deleteCandidate}
          candidateId={candidate.id}
          stageName={candidate.stageName}
        />
      </div>
    </main>
  );
}
