type CampayTokenResponse = { token: string };
type CampayCollectResponse = {
  reference: string;
  ussd_code?: string;
  operator?: string;
  status?: string;
};

type CampayStatusResponse = {
  reference: string;
  status: string;
  amount?: string;
  currency?: string;
  operator?: string;
};

function baseUrl() {
  return process.env.CAMPAY_BASE_URL ?? "https://demo.campay.net/api";
}

async function getToken() {
  const username = process.env.CAMPAY_USERNAME;
  const password = process.env.CAMPAY_PASSWORD;

  if (!username || !password) {
    return null;
  }

  const res = await fetch(`${baseUrl()}/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Impossible d'obtenir le token Campay");
  }

  const data = (await res.json()) as CampayTokenResponse;
  return data.token;
}

export function isCampayConfigured() {
  return Boolean(process.env.CAMPAY_USERNAME && process.env.CAMPAY_PASSWORD);
}

export async function collectPayment(params: {
  amount: number;
  phone: string;
  description: string;
  externalReference: string;
}) {
  const token = await getToken();

  if (!token) {
    return {
      mode: "demo" as const,
      reference: `DEMO-${params.externalReference}`,
      ussdCode: null,
    };
  }

  const res = await fetch(`${baseUrl()}/collect/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: String(params.amount),
      currency: "XAF",
      from: params.phone,
      description: params.description,
      external_reference: params.externalReference,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Campay collect failed: ${text}`);
  }

  const data = (await res.json()) as CampayCollectResponse;
  return {
    mode: "live" as const,
    reference: data.reference,
    ussdCode: data.ussd_code ?? null,
  };
}

export async function getPaymentStatus(campayRef: string) {
  const token = await getToken();
  if (!token) {
    return { status: "SUCCESSFUL" as const };
  }

  const res = await fetch(`${baseUrl()}/transaction/${campayRef}/`, {
    headers: { Authorization: `Token ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Impossible de vérifier le paiement Campay");
  }

  const data = (await res.json()) as CampayStatusResponse;
  return { status: data.status.toUpperCase() };
}
