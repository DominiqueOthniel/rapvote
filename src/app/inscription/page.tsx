import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  createCandidateSession,
  getCandidateSession,
  hashPassword,
} from "@/lib/auth";
import { getActiveSeason, uniqueCandidateSlug } from "@/lib/competition";
import { prisma } from "@/lib/db";
import { COMPETITION_BRAND } from "@/lib/parcours";
import { saveCandidatePhoto } from "@/lib/upload";
import { InscriptionForm } from "@/components/InscriptionForm";

export const dynamic = "force-dynamic";

async function registerCandidate(formData: FormData) {
  "use server";

  const season = await getActiveSeason();
  if (!season) {
    return { ok: false, error: "Aucune saison active." };
  }
  if (!season.registrationsOpen) {
    return { ok: false, error: "Les inscriptions sont fermées." };
  }

  const stageName = String(formData.get("stageName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const city = String(formData.get("city") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!stageName) {
    return { ok: false, error: "Le nom de scène est obligatoire." };
  }
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Email invalide." };
  }
  if (password.length < 4) {
    return { ok: false, error: "Mot de passe trop court (4 caractères min)." };
  }

  const existingEmail = await prisma.candidate.findUnique({ where: { email } });
  if (existingEmail) {
    return { ok: false, error: "Cet email a déjà un compte artiste." };
  }

  const slug = await uniqueCandidateSlug(stageName);
  const passwordHash = await hashPassword(password);

  let photoUrl: string | null = null;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    try {
      photoUrl = await saveCandidatePhoto(photo, slug);
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Photo invalide",
      };
    }
  }

  const candidate = await prisma.candidate.create({
    data: {
      seasonId: season.id,
      stageName,
      slug,
      email,
      passwordHash,
      city: city || null,
      bio: bio || null,
      phone: phone || null,
      photoUrl,
      status: "active",
      source: "self",
    },
  });

  const activePhase = season.phases.find((p) => p.status === "active");
  if (activePhase) {
    await prisma.phaseEntry.upsert({
      where: {
        phaseId_candidateId: {
          phaseId: activePhase.id,
          candidateId: candidate.id,
        },
      },
      create: {
        phaseId: activePhase.id,
        candidateId: candidate.id,
        status: "active",
      },
      update: { status: "active" },
    });
  }

  await createCandidateSession(candidate.id);

  revalidatePath("/");
  revalidatePath("/classement");
  revalidatePath("/admin/candidats");
  revalidatePath("/inscription");
  revalidatePath("/candidat");

  return { ok: true, redirectTo: "/candidat" };
}

export default async function InscriptionPage() {
  const session = await getCandidateSession();
  if (session) redirect("/candidat");

  const season = await getActiveSeason();
  const open = season?.registrationsOpen ?? false;

  return (
    <main className="shell section">
      <div className="section-head">
        <div>
          <p className="muted">{COMPETITION_BRAND}</p>
          <h1 className="page-title">Inscription artiste</h1>
          <p className="parcours-intro">
            Crée ton compte candidat. Ensuite tu gères ton profil dans ton
            espace privé.
          </p>
        </div>
        <Link className="btn-ghost" href="/candidat/login">
          Déjà inscrit
        </Link>
      </div>

      {!season ? (
        <div className="admin-card">
          <p className="muted">Aucune saison active pour le moment.</p>
        </div>
      ) : (
        <InscriptionForm action={registerCandidate} registrationsOpen={open} />
      )}
    </main>
  );
}
