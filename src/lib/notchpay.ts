import {
  detectOperator,
  normalizeCameroonPhone,
} from "@/lib/money";

export type NotchChannel = "cm.mtn" | "cm.orange";

export type NotchTransfer = {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  channel?: string;
  description?: string;
  created_at?: string;
  completed_at?: string;
  failure_reason?: string;
};

type NotchTransferResponse = {
  code?: number;
  status?: string;
  message?: string;
  transfer?: NotchTransfer;
  errors?: Record<string, string[]>;
};

function baseUrl() {
  return process.env.NOTCHPAY_BASE_URL ?? "https://api.notchpay.co";
}

function getKeys() {
  const publicKey = process.env.NOTCHPAY_PUBLIC_KEY?.trim();
  const privateKey = process.env.NOTCHPAY_PRIVATE_KEY?.trim();
  return { publicKey, privateKey };
}

export function isNotchPayConfigured() {
  const { publicKey, privateKey } = getKeys();
  return Boolean(publicKey && privateKey);
}

export function formatNotchPhone(phone: string) {
  const digits = normalizeCameroonPhone(phone);
  if (!digits.startsWith("237") || digits.length !== 12) {
    throw new Error("Numéro Mobile Money invalide (ex: 6XXXXXXXX)");
  }
  return `+${digits}`;
}

export function channelFromOperator(operator: "ORANGE" | "MTN"): NotchChannel {
  return operator === "ORANGE" ? "cm.orange" : "cm.mtn";
}

export function resolvePayoutChannel(
  phone: string,
  operatorOverride?: "ORANGE" | "MTN" | null,
): NotchChannel {
  if (operatorOverride === "ORANGE" || operatorOverride === "MTN") {
    return channelFromOperator(operatorOverride);
  }
  const detected = detectOperator(normalizeCameroonPhone(phone));
  if (!detected) {
    throw new Error("Impossible de détecter MTN ou Orange. Choisis l'opérateur.");
  }
  return channelFromOperator(detected);
}

async function notchFetch(path: string, init?: RequestInit) {
  const { publicKey, privateKey } = getKeys();
  if (!publicKey || !privateKey) {
    throw new Error("Notch Pay non configuré (NOTCHPAY_PUBLIC_KEY / NOTCHPAY_PRIVATE_KEY)");
  }

  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: publicKey,
      "X-Grant": privateKey,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as NotchTransferResponse & {
    message?: string;
  };

  if (!res.ok) {
    const detail =
      data.message ||
      (data.errors ? JSON.stringify(data.errors) : null) ||
      `HTTP ${res.status}`;
    throw new Error(`Notch Pay: ${detail}`);
  }

  return data;
}

export async function createNotchTransfer(params: {
  amountXaf: number;
  phone: string;
  name: string;
  email?: string | null;
  channel: NotchChannel;
  reference: string;
  description: string;
}) {
  const phone = formatNotchPhone(params.phone);

  const data = await notchFetch("/transfers", {
    method: "POST",
    body: JSON.stringify({
      amount: params.amountXaf,
      currency: "XAF",
      channel: params.channel,
      description: params.description,
      reference: params.reference,
      beneficiary_data: {
        name: params.name,
        phone,
        ...(params.email ? { email: params.email } : {}),
        country: "CM",
      },
      metadata: {
        source: "fortheculture",
        type: "candidate_payout",
      },
    }),
  });

  if (!data.transfer?.id) {
    throw new Error(data.message ?? "Transfert Notch Pay non créé");
  }

  return data.transfer;
}

export async function getNotchTransfer(idOrReference: string) {
  const data = await notchFetch(`/transfers/${encodeURIComponent(idOrReference)}`);
  if (!data.transfer) {
    throw new Error(data.message ?? "Transfert introuvable");
  }
  return data.transfer;
}

export function normalizeNotchStatus(status: string) {
  const value = status.toLowerCase();
  if (value === "completed" || value === "success" || value === "successful") {
    return "complete";
  }
  if (value === "cancelled") return "canceled";
  return value;
}
