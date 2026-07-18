import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Image from "next/image";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActiveSeason, uniqueCandidateSlug } from "@/lib/competition";
import { formatVotes, formatXaf } from "@/lib/money";
import { saveCandidatePhoto, deleteCandidatePhotoFile } from "@/lib/upload";
import { DeleteCandidateButton } from "@/components/admin/DeleteCandidateButton";

export const dynamic = "force-dynamic";

function revalidateCandidateViews() {
  revalidatePath("/admin/candidats");
  revalidatePath("/");
  revalidatePath("/classement");
  revalidatePath("/admin/phases");
}

async function createCandidate(formData: FormData) {
  "use server";
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const season = await getActiveSeason();
  if (!season) throw new Error("Aucune saison active");

  const stageName = String(formData.get("stageName") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  if (!stageName) return;

  const slug = await uniqueCandidateSlug(stageName);

  const photo = formData.get("photo");
  let photoUrl: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    photoUrl = await saveCandidatePhoto(photo, slug);
  }

  const candidate = await prisma.candidate.create({
    data: {
      seasonId: season.id,
      stageName,
      slug,
      city: city || null,
      bio: bio || null,
      photoUrl,
    },
  });

  const activePhase = season.phases.find((p) => p.status === "active");
  if (activePhase) {
    await prisma.phaseEntry.create({
      data: {
        phaseId: activePhase.id,
        candidateId: candidate.id,
        status: "active",
      },
    });
  }

  revalidateCandidateViews();
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

  revalidateCandidateViews();
}

export default async function AdminCandidatesPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const season = await getActiveSeason();
  const candidates = season
    ? await prisma.candidate.findMany({
        where: { seasonId: season.id },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <main>
      <h1 className="page-title">Candidats</h1>
      <p className="muted">Créés uniquement par l&apos;administration.</p>

      <form
        action={createCandidate}
        className="admin-card admin-form"
        encType="multipart/form-data"
      >
        <h2 className="admin-form-title">Nouveau candidat</h2>
        <label className="field">
          <span>Nom de scène</span>
          <input name="stageName" required placeholder="Ex: Benda Fire" />
        </label>
        <label className="field">
          <span>Ville</span>
          <input name="city" placeholder="Douala" />
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
          <span>Bio</span>
          <textarea name="bio" rows={3} placeholder="Style, force, vibe..." />
        </label>
        <button className="btn-primary" type="submit">
          Ajouter le candidat
        </button>
      </form>

      <div className="admin-card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Photo</th>
                <th>Artiste</th>
                <th>Ville</th>
                <th>Votes</th>
                <th>Gains (50%)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.id}>
                  <td>
                    {c.photoUrl ? (
                      <span className="admin-thumb">
                        <Image
                          src={c.photoUrl}
                          alt={c.stageName}
                          width={48}
                          height={64}
                          className="admin-thumb-img"
                        />
                      </span>
                    ) : (
                      <span className="admin-thumb admin-thumb-empty">
                        {c.stageName.slice(0, 2)}
                      </span>
                    )}
                  </td>
                  <td>
                    <strong>{c.stageName}</strong>
                    <div className="muted">{c.slug}</div>
                  </td>
                  <td>{c.city ?? "—"}</td>
                  <td>{formatVotes(c.totalVotes)}</td>
                  <td>{formatXaf(c.totalEarnedXaf)}</td>
                  <td>
                    <div className="admin-row-actions">
                      <Link className="btn-ghost" href={`/admin/candidats/${c.id}`}>
                        Modifier
                      </Link>
                      <DeleteCandidateButton
                        action={deleteCandidate}
                        candidateId={c.id}
                        stageName={c.stageName}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
