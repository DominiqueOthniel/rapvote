export const CANDIDATE_SHARE_RATIO = 0.5;
export const ADMIN_SHARE_RATIO = 0.5;

export function splitAmount(amountXaf: number) {
  const candidateShareXaf = Math.floor(amountXaf * CANDIDATE_SHARE_RATIO);
  const adminShareXaf = amountXaf - candidateShareXaf;
  return { candidateShareXaf, adminShareXaf };
}

export function formatXaf(amount: number) {
  return new Intl.NumberFormat("fr-CM", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatVotes(count: number) {
  return new Intl.NumberFormat("fr-CM").format(count);
}

export function normalizeCameroonPhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("237") && digits.length === 12) return digits;
  if (digits.length === 9) return `237${digits}`;
  return digits;
}

export function detectOperator(phone: string): "ORANGE" | "MTN" | null {
  const local = phone.replace(/^237/, "");
  if (/^(69|65[5-9]|68)/.test(local)) return "ORANGE";
  if (/^(67|65[0-4]|68)/.test(local)) return "MTN";
  if (/^6[57]/.test(local)) return local.startsWith("65") ? "ORANGE" : "MTN";
  if (local.startsWith("69")) return "ORANGE";
  if (local.startsWith("67")) return "MTN";
  return null;
}
