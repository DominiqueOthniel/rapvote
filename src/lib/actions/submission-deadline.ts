"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession, getJurySession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  isLateSubmission,
  parseDoualaDateTimeLocal,
} from "@/lib/submission-deadline";

async function canManageDeadline() {
  const [admin, jury] = await Promise.all([
    getAdminSession(),
    getJurySession(),
  ]);
  return Boolean(admin || jury);
}

function revalidateDeadlineViews() {
  revalidatePath("/admin/phases");
  revalidatePath("/jury");
  revalidatePath("/");
  revalidatePath("/candidat");
  revalidatePath("/candidats");
}

export async function setPhaseSubmissionDeadline(formData: FormData) {
  if (!(await canManageDeadline())) {
    throw new Error("Non autorisé");
  }

  const phaseId = String(formData.get("phaseId") ?? "");
  const raw = String(formData.get("deadline") ?? "").trim();
  const clear = formData.get("clear") === "1";
  if (!phaseId) return;

  const deadline = clear || !raw ? null : parseDoualaDateTimeLocal(raw);
  if (!clear && raw && !deadline) {
    throw new Error("Date invalide");
  }

  await prisma.phase.update({
    where: { id: phaseId },
    data: { submissionDeadlineAt: deadline },
  });

  // Recalcule le retard des sons déjà uploadés pour cette phase.
  const tracks = await prisma.phaseTrack.findMany({
    where: { phaseId },
    select: { id: true, submittedAt: true },
  });
  await Promise.all(
    tracks.map((track) =>
      prisma.phaseTrack.update({
        where: { id: track.id },
        data: {
          lateSubmission: isLateSubmission(track.submittedAt, deadline),
        },
      }),
    ),
  );

  revalidateDeadlineViews();
}
