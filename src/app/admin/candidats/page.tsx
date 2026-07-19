import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Image from "next/image";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActiveSeason } from "@/lib/competition";
import { formatVotes, formatXaf } from "@/lib/money";
import { deleteCandidatePhotoFile } from "@/lib/upload";
import { DeleteCandidateButton } from "@/components/admin/DeleteCandidateButton";

export const dynamic = "force-dynamic";

function revalidateCandidateViews() {
  revalidatePath("/admin/candidats");
  revalidatePath("/");
  revalidatePath("/classement");
  revalidatePath("/admin/phases");
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

async function toggleRegistrations(formData: FormData) {
  "use server";
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const seasonId = String(formData.get("seasonId") ?? "");
  const open = String(formData.get("open") ?? "") === "1";
  if (!seasonId) return;

  await prisma.season.update({
    where: { id: seasonId },
    data: { registrationsOpen: open },
  });

  revalidatePath("/admin/candidats");
  revalidatePath("/inscription");
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
      <p className="muted">
        Les artistes créent leur compte et gèrent leur profil. Ton rôle : ouvrir
        ou terminer les inscriptions, puis suivre la liste.
      </p>

      {season ? (
        <div className="admin-card registration-toggle">
          <div>
            <h2 className="admin-form-title">Inscriptions artistes</h2>
            <p className="muted">
              {season.registrationsOpen
                ? "Ouvertes · les candidats s'inscrivent sur /inscription."
                : "Fermées · plus de nouveaux comptes artistes."}
            </p>
            <p className="muted" style={{ marginTop: "0.35rem" }}>
              Espace candidat : <Link href="/candidat/login">/candidat</Link>
            </p>
          </div>
          <form action={toggleRegistrations}>
            <input type="hidden" name="seasonId" value={season.id} />
            <input
              type="hidden"
              name="open"
              value={season.registrationsOpen ? "0" : "1"}
            />
            <button className="btn-primary" type="submit">
              {season.registrationsOpen
                ? "Terminer les inscriptions"
                : "Rouvrir les inscriptions"}
            </button>
          </form>
        </div>
      ) : null}

      <div className="admin-card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Photo</th>
                <th>Artiste</th>
                <th>Compte</th>
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
                    {c.phone ? <div className="muted">{c.phone}</div> : null}
                  </td>
                  <td>
                    {c.email ? (
                      <>
                        <div>{c.email}</div>
                        <div className="muted">
                          {c.passwordHash ? "compte actif" : "sans mot de passe"}
                        </div>
                      </>
                    ) : (
                      <span className="muted">pas de compte</span>
                    )}
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
