/**
 * Toutes les 2 minutes: rattrape les paiements Notch complete
 * dont les votes n'ont pas encore été crédités.
 */
export default async function handler() {
  const base =
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    "https://fortheculture.netlify.app";
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    return new Response("AUTH_SECRET manquant", { status: 500 });
  }

  const res = await fetch(`${base}/api/vote/reconcile`, {
    method: "POST",
    headers: {
      "x-reconcile-secret": secret,
      Accept: "application/json",
    },
  });

  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

export const config = {
  schedule: "*/2 * * * *",
};
