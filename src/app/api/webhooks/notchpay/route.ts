import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeNotchStatus } from "@/lib/notchpay";
import { confirmTransaction } from "@/lib/votes";

export const dynamic = "force-dynamic";

type NotchWebhookEvent = {
  id?: string;
  type?: string;
  status?: string;
  data?: {
    id?: string;
    reference?: string;
    trxref?: string;
    status?: string;
    amount?: number;
    transaction?: string | { id?: string; reference?: string; trxref?: string; status?: string };
    payment?: { id?: string; reference?: string; status?: string };
  };
  transaction?: string | { id?: string; reference?: string; trxref?: string; status?: string };
  payment?: { id?: string; reference?: string; status?: string };
};

function verifySignature(rawBody: string, signature: string | null, hash: string) {
  if (!signature) return false;
  const expected = createHmac("sha256", hash).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function collectRefs(event: NotchWebhookEvent): string[] {
  const refs = new Set<string>();
  const push = (value?: string | null) => {
    if (value && value.trim()) refs.add(value.trim());
  };

  const dig = (
    value?: string | { id?: string; reference?: string; trxref?: string } | null,
  ) => {
    if (!value) return;
    if (typeof value === "string") {
      push(value);
      return;
    }
    push(value.reference);
    push(value.trxref);
    push(value.id);
  };

  dig(event.data);
  dig(event.data?.transaction);
  dig(event.data?.payment);
  dig(event.transaction);
  dig(event.payment);
  push(event.data?.reference);
  push(event.data?.trxref);
  push(event.data?.id);

  return [...refs];
}

async function findTransaction(refs: string[]) {
  for (const ref of refs) {
    const byMerchant = await prisma.transaction.findUnique({
      where: { reference: ref },
    });
    if (byMerchant) return byMerchant;

    const byProvider = await prisma.transaction.findFirst({
      where: { campayRef: ref },
    });
    if (byProvider) return byProvider;
  }
  return null;
}

function eventLooksComplete(event: NotchWebhookEvent) {
  const type = (event.type ?? "").toLowerCase();
  if (type === "payment.complete" || type === "payment.completed") return true;

  const statuses = [
    event.data?.status,
    event.status,
    typeof event.data?.transaction === "object"
      ? event.data.transaction?.status
      : undefined,
    event.data?.payment?.status,
    typeof event.transaction === "object" ? event.transaction?.status : undefined,
    event.payment?.status,
  ];

  return statuses.some((status) => {
    if (!status) return false;
    return normalizeNotchStatus(status) === "complete";
  });
}

function eventLooksFailed(event: NotchWebhookEvent) {
  const type = (event.type ?? "").toLowerCase();
  if (
    type === "payment.failed" ||
    type === "payment.canceled" ||
    type === "payment.cancelled" ||
    type === "payment.expired"
  ) {
    return true;
  }

  const statuses = [
    event.data?.status,
    event.status,
    typeof event.data?.transaction === "object"
      ? event.data.transaction?.status
      : undefined,
  ];

  return statuses.some((status) => {
    if (!status) return false;
    const n = normalizeNotchStatus(status);
    return n === "failed" || n === "canceled";
  });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature =
    request.headers.get("x-notch-signature") ??
    request.headers.get("X-Notch-Signature") ??
    request.headers.get("x-notchpay-signature");
  const hash = process.env.NOTCHPAY_WEBHOOK_HASH?.trim();

  // Si hash configuré, on vérifie. Sinon on traite quand même (évite de perdre des votes).
  if (hash && signature && !verifySignature(rawBody, signature, hash)) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  let event: NotchWebhookEvent;
  try {
    event = JSON.parse(rawBody) as NotchWebhookEvent;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const refs = collectRefs(event);
  const tx = await findTransaction(refs);

  if (!tx) {
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: "transaction introuvable",
      type: event.type ?? null,
      refs,
    });
  }

  if (eventLooksComplete(event)) {
    const confirmed = await confirmTransaction(tx.id);
    return NextResponse.json({
      ok: true,
      credited: true,
      reference: confirmed.reference,
      votesCount: confirmed.votesCount,
    });
  }

  if (eventLooksFailed(event)) {
    if (tx.status === "pending") {
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { status: "failed" },
      });
    }
    return NextResponse.json({ ok: true, failed: true, reference: tx.reference });
  }

  return NextResponse.json({
    ok: true,
    ignored: true,
    type: event.type ?? null,
    reference: tx.reference,
  });
}
