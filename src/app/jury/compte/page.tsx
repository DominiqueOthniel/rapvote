import { redirect } from "next/navigation";
import {
  getJurySession,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export const dynamic = "force-dynamic";

async function changeJuryPassword(formData: FormData) {
  "use server";

  const jury = await getJurySession();
  if (!jury) redirect("/jury/login");

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 4) {
    return { ok: false, error: "Nouveau mot de passe trop court (4 min)." };
  }
  if (newPassword !== confirmPassword) {
    return { ok: false, error: "La confirmation ne correspond pas." };
  }

  const valid = await verifyPassword(currentPassword, jury.passwordHash);
  if (!valid) {
    return { ok: false, error: "Mot de passe actuel incorrect." };
  }

  await prisma.jury.update({
    where: { id: jury.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  return { ok: true, message: "Mot de passe jury mis à jour." };
}

export default async function JuryAccountPage() {
  const jury = await getJurySession();
  if (!jury) redirect("/jury/login");

  return (
    <main>
      <h1 className="page-title">Mon compte</h1>
      <p className="muted">
        Connecté en tant que <strong>{jury.name}</strong> ({jury.email}).
      </p>
      <div style={{ marginTop: "1.5rem" }}>
        <ChangePasswordForm action={changeJuryPassword} />
      </div>
    </main>
  );
}
