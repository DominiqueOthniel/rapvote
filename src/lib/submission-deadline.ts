/** Pénalité sur le score de phase si upload après le délai. */
export const LATE_SUBMISSION_PENALTY = 1.5;

/** Les jurys peuvent écouter 1 h avant le délai public. */
export const JURY_EARLY_ACCESS_MS = 60 * 60 * 1000;

export type ListenRole = "public" | "jury" | "admin" | "owner";

export type TrackListenState = {
  canListen: boolean;
  locked: boolean;
  unlockAt: Date | null;
  message: string | null;
  juryPreview: boolean;
};

/** Parse un datetime-local saisi en heure Cameroun (UTC+1). */
export function parseDoualaDateTimeLocal(value: string): Date | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) return null;
  const date = new Date(`${trimmed}:00+01:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDoualaDateTimeLocalValue(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Douala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function formatDoualaDateTime(date: Date): string {
  return new Intl.DateTimeFormat("fr-CM", {
    timeZone: "Africa/Douala",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDoualaClock(date: Date): string {
  return new Intl.DateTimeFormat("fr-CM", {
    timeZone: "Africa/Douala",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function isLateSubmission(
  submittedAt: Date,
  deadline: Date | null | undefined,
): boolean {
  if (!deadline) return false;
  return submittedAt.getTime() > deadline.getTime();
}

export function getTrackListenState(args: {
  deadline: Date | null | undefined;
  role: ListenRole;
  now?: Date;
}): TrackListenState {
  const now = args.now ?? new Date();
  const deadline = args.deadline ?? null;

  if (!deadline) {
    return {
      canListen: true,
      locked: false,
      unlockAt: null,
      message: null,
      juryPreview: false,
    };
  }

  if (args.role === "admin" || args.role === "owner") {
    return {
      canListen: true,
      locked: false,
      unlockAt: null,
      message: null,
      juryPreview: false,
    };
  }

  if (now.getTime() >= deadline.getTime()) {
    return {
      canListen: true,
      locked: false,
      unlockAt: null,
      message: null,
      juryPreview: false,
    };
  }

  const juryOpenAt = new Date(deadline.getTime() - JURY_EARLY_ACCESS_MS);

  if (args.role === "jury") {
    if (now.getTime() >= juryOpenAt.getTime()) {
      return {
        canListen: true,
        locked: false,
        unlockAt: deadline,
        message: `Avant-première jury · public à ${formatDoualaClock(deadline)}`,
        juryPreview: true,
      };
    }
    return {
      canListen: false,
      locked: true,
      unlockAt: juryOpenAt,
      message: `Écoute jury dès ${formatDoualaClock(juryOpenAt)}`,
      juryPreview: false,
    };
  }

  return {
    canListen: false,
    locked: true,
    unlockAt: deadline,
    message: `Disponible à ${formatDoualaClock(deadline)}`,
    juryPreview: false,
  };
}
