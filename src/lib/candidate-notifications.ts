import { prisma } from "@/lib/db";

export type CandidateNotificationType = "like" | "comment" | "download";

type CreateArgs = {
  candidateId: string;
  type: CandidateNotificationType;
  trackId?: string | null;
  fanId?: string | null;
  commentId?: string | null;
  title: string;
  body?: string | null;
};

export function trackLabel(title: string | null | undefined) {
  const clean = title?.trim();
  return clean ? `« ${clean} »` : "ton son";
}

export async function createCandidateNotification(args: CreateArgs) {
  try {
    await prisma.candidateNotification.create({
      data: {
        candidateId: args.candidateId,
        type: args.type,
        trackId: args.trackId ?? null,
        fanId: args.fanId ?? null,
        commentId: args.commentId ?? null,
        title: args.title,
        body: args.body ?? null,
      },
    });
  } catch {
    // Les notifs ne doivent jamais casser like / comment / download.
  }
}
