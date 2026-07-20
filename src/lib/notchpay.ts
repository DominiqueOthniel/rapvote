import {
  detectOperator,
  normalizeCameroonPhone,
} from "@/lib/money";

export type NotchChannel = "cm.mtn" | "cm.orange";

export type NotchTransfer = {
  id?: string;
  reference: string;
  amount?: number;
  currency?: string;
  status: string;
  channel?: string;
  description?: string;
  created_at?: string;
  completed_at?: string;
  failure_reason?: string;
};

type NotchTransaction = {
  id?: string;
  reference?: string;
  trxref?: string;
  status?: string;
};

type NotchJson = {
  code?: number;
  status?: string;
  message?: string;
  transfer?: NotchTransfer | string;
  beneficiary?: string | { id?: string };
  recipient?: string | { id?: string };
  transaction?: string | NotchTransaction;
  payment?: { id?: string; reference?: string; status?: string };
  authorization_url?: string;
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

/** Clés présentes = Notch Pay prêt (encaisser + verser). */
export function isNotchPayConfigured() {
  const { publicKey, privateKey } = getKeys();
  return Boolean(publicKey && privateKey);
}

export function notchPublicKeyKind() {
  const { publicKey } = getKeys();
  if (!publicKey) return "missing";
  if (publicKey.startsWith("pk_test")) return "test";
  if (publicKey.startsWith("pk_live")) return "live";
  return "unknown";
}

export function formatNotchPhone(phone: string) {
  const digits = normalizeCameroonPhone(phone);
  if (!digits.startsWith("237") || digits.length !== 12) {
    throw new Error("Numéro Mobile Money invalide (ex: 6XXXXXXXX)");
  }
  return `+${digits}`;
}

/** Compte mobile money sans + pour certains endpoints Notch. */
export function formatNotchAccount(phone: string) {
  return normalizeCameroonPhone(phone);
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

async function notchFetch(
  path: string,
  init?: RequestInit,
  opts?: { grant?: boolean },
) {
  const { publicKey, privateKey } = getKeys();
  if (!publicKey) {
    throw new Error("NOTCHPAY_PUBLIC_KEY manquant");
  }
  if (opts?.grant !== false && !privateKey) {
    throw new Error("NOTCHPAY_PRIVATE_KEY manquant");
  }

  const headers: Record<string, string> = {
    Authorization: publicKey,
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };

  if (opts?.grant !== false && privateKey) {
    headers["X-Grant"] = privateKey;
  }

  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const text = await res.text();
  let data = {} as NotchJson;
  try {
    data = text ? (JSON.parse(text) as NotchJson) : {};
  } catch {
    throw new Error(
      `Notch Pay: réponse non JSON (HTTP ${res.status}) ${text.slice(0, 120)}`,
    );
  }

  if (!res.ok) {
    const detail =
      data.message ||
      (data.errors ? JSON.stringify(data.errors) : null) ||
      `HTTP ${res.status}`;
    throw new Error(`Notch Pay: ${detail}`);
  }

  return data;
}

function extractId(
  value: string | { id?: string; reference?: string } | undefined,
): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.reference ?? value.id ?? null;
}

export function normalizeNotchStatus(status: string) {
  const value = status.toLowerCase();
  if (
    value === "completed" ||
    value === "success" ||
    value === "successful" ||
    value === "paid" ||
    value === "complete"
  ) {
    return "complete";
  }
  if (value === "cancelled" || value === "canceled") return "canceled";
  if (value === "sent" || value === "processing" || value === "pending") {
    return value === "sent" ? "processing" : value;
  }
  return value;
}

function notchPaymentRef(data: NotchJson, fallback?: string) {
  const tx = data.transaction;
  if (typeof tx === "object" && tx?.reference) return tx.reference;
  if (data.payment?.reference) return data.payment.reference;
  const extracted =
    extractId(data.transaction) ?? extractId(data.payment) ?? null;
  return extracted ?? fallback ?? null;
}

function describeNotchPayload(data: NotchJson) {
  return JSON.stringify({
    code: data.code,
    status: data.status,
    message: data.message,
    keys: Object.keys(data),
    transactionType: typeof data.transaction,
    paymentRef: data.payment?.reference ?? null,
    txRef:
      typeof data.transaction === "object"
        ? data.transaction?.reference
        : data.transaction,
    authorization_url: Boolean(data.authorization_url),
  });
}

/** Encaisser un vote : init + process Mobile Money, sinon checkout Notch. */
export async function collectVotePayment(params: {
  amountXaf: number;
  phone: string;
  operator: "ORANGE" | "MTN";
  reference: string;
  description: string;
  callbackUrl?: string;
}) {
  if (!isNotchPayConfigured()) {
    return { mode: "demo" as const, reference: params.reference };
  }

  const phonePlus = formatNotchPhone(params.phone);
  const channel = channelFromOperator(params.operator);

  const initialized = await notchFetch(
    "/payments",
    {
      method: "POST",
      body: JSON.stringify({
        amount: params.amountXaf,
        currency: "XAF",
        email: "votant@fortheculture.cm",
        phone: phonePlus,
        customer: {
          name: "Votant ForTheCulture",
          email: "votant@fortheculture.cm",
          phone: phonePlus,
        },
        description: params.description,
        reference: params.reference,
        locked_currency: "XAF",
        locked_channel: channel,
        locked_country: "CM",
        ...(params.callbackUrl ? { callback: params.callbackUrl } : {}),
        metadata: {
          source: "fortheculture",
          type: "vote",
          operator: params.operator,
        },
      }),
    },
    { grant: false },
  );

  const paymentRef = notchPaymentRef(initialized, params.reference);
  if (!paymentRef) {
    throw new Error(
      `Notch Pay: paiement créé sans référence. ${describeNotchPayload(initialized)}`,
    );
  }

  const authorizationUrl = initialized.authorization_url ?? null;
  if (!authorizationUrl) {
    // Sans URL checkout, on tente quand même le process direct.
    try {
      const processed = await notchFetch(
        `/payments/${encodeURIComponent(paymentRef)}`,
        {
          method: "POST",
          body: JSON.stringify({
            channel,
            data: {
              phone: phonePlus,
              account_number: phonePlus,
            },
          }),
        },
        { grant: false },
      );
      return {
        mode: "live" as const,
        reference: notchPaymentRef(processed, paymentRef) ?? paymentRef,
        authorizationUrl: null,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : `Notch Pay: pas d'URL checkout et process impossible. ${describeNotchPayload(initialized)}`,
      );
    }
  }

  // Checkout Notch: plus fiable pour déclencher Orange/MTN Money.
  // On tente aussi le process direct (push) avant la redirection.
  try {
    await notchFetch(
      `/payments/${encodeURIComponent(paymentRef)}`,
      {
        method: "POST",
        body: JSON.stringify({
          channel,
          data: {
            phone: phonePlus,
            account_number: phonePlus,
          },
        }),
      },
      { grant: false },
    );
  } catch {
    // Le checkout couvre ce cas.
  }

  return {
    mode: "live" as const,
    reference: paymentRef,
    authorizationUrl,
  };
}

export async function getNotchPaymentStatus(paymentRef: string) {
  if (!isNotchPayConfigured()) {
    return { status: "complete" as const };
  }

  const data = await notchFetch(
    `/payments/${encodeURIComponent(paymentRef)}`,
    { method: "GET" },
    { grant: false },
  );

  const rawStatus =
    (typeof data.transaction === "object" && data.transaction?.status) ||
    data.payment?.status ||
    (data.status && data.status !== "Accepted" && data.status !== "OK"
      ? data.status
      : null) ||
    "pending";

  return { status: normalizeNotchStatus(String(rawStatus)) };
}

async function createBeneficiary(params: {
  name: string;
  phone: string;
  email?: string | null;
  channel: NotchChannel;
  reference: string;
}) {
  const phonePlus = formatNotchPhone(params.phone);
  const account = formatNotchAccount(params.phone);

  const data = await notchFetch("/beneficiaries", {
    method: "POST",
    body: JSON.stringify({
      channel: params.channel,
      name: params.name,
      account_number: account,
      phone: phonePlus,
      ...(params.email ? { email: params.email } : {}),
      country: "CM",
      reference: `${params.reference}-BEN`,
      description: "Artiste ForTheCulture",
    }),
  });

  const id =
    extractId(data.beneficiary) ??
    extractId(data.recipient) ??
    (typeof data.beneficiary === "string" ? data.beneficiary : null);

  if (!id) {
    throw new Error(data.message ?? "Bénéficiaire Notch Pay non créé");
  }

  return id;
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
  const beneficiaryId = await createBeneficiary({
    name: params.name,
    phone: params.phone,
    email: params.email,
    channel: params.channel,
    reference: params.reference,
  });

  const data = await notchFetch("/transfers", {
    method: "POST",
    body: JSON.stringify({
      amount: params.amountXaf,
      currency: "XAF",
      description: params.description,
      reference: params.reference,
      beneficiary: beneficiaryId,
      recipient: beneficiaryId,
      channel: params.channel,
      metadata: {
        source: "fortheculture",
        type: "candidate_payout",
      },
    }),
  });

  const transferRaw = data.transfer;
  if (!transferRaw) {
    throw new Error(data.message ?? "Transfert Notch Pay non créé");
  }

  if (typeof transferRaw === "string") {
    return {
      id: transferRaw,
      reference: params.reference,
      status: "pending",
    } satisfies NotchTransfer;
  }

  return {
    id: transferRaw.id ?? transferRaw.reference,
    reference: transferRaw.reference ?? params.reference,
    amount: transferRaw.amount,
    currency: transferRaw.currency,
    status: transferRaw.status ?? "pending",
    channel: transferRaw.channel,
    description: transferRaw.description,
    created_at: transferRaw.created_at,
    completed_at: transferRaw.completed_at,
    failure_reason: transferRaw.failure_reason,
  } satisfies NotchTransfer;
}

export async function getNotchTransfer(idOrReference: string) {
  const data = await notchFetch(
    `/transfers/${encodeURIComponent(idOrReference)}`,
  );
  const transferRaw = data.transfer;
  if (!transferRaw) {
    throw new Error(data.message ?? "Transfert introuvable");
  }
  if (typeof transferRaw === "string") {
    return {
      id: transferRaw,
      reference: idOrReference,
      status: "pending",
    } satisfies NotchTransfer;
  }
  return {
    id: transferRaw.id ?? transferRaw.reference,
    reference: transferRaw.reference ?? idOrReference,
    amount: transferRaw.amount,
    currency: transferRaw.currency,
    status: transferRaw.status ?? "pending",
    channel: transferRaw.channel,
    description: transferRaw.description,
    created_at: transferRaw.created_at,
    completed_at: transferRaw.completed_at,
    failure_reason: transferRaw.failure_reason,
  } satisfies NotchTransfer;
}
