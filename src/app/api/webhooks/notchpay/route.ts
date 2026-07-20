import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { confirmTransaction } from "@/lib/votes";

export const dynamic = "force-dynamic";

type NotchWebhookEvent = {
  id?: string;
  type?: string;
  data?: {
    id?: string;
    reference?: string;
    trxref?: string;
    status?: string;
    amount?: number;
  };
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

async function findTransaction(data: NotchWebhookEvent["data"]) {
  if (!data) return null;
  const refs = [data.reference, data.trxref, data.id].filter(
    (value): value is string => Boolean(value),
  );

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

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature =
    request.headers.get("x-notch-signature") ??
    request.headers.get("X-Notch-Signature");
  const hash = process.env.NOTCHPAY_WEBHOOK_HASH?.trim();

  if (hash && !verifySignature(rawBody, signature, hash)) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  let event: NotchWebhookEvent;
  try {
    event = JSON.parse(rawBody) as NotchWebhookEvent;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const type = event.type ?? "";
  const tx = await findTransaction(event.data);

  if (!tx) {
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: "transaction introuvable",
      type,
      refs: {
        reference: event.data?.reference ?? null,
        trxref: event.data?.trxref ?? null,
        id: event.data?.id ?? null,
      },
    });
  }

  if (type === "payment.complete" || event.data?.status === "complete") {
    if (tx.status !== "paid") {
      await confirmTransaction(tx.id);
    }
    return NextResponse.json({ ok: true, credited: true, reference: tx.reference });
  }

  if (
    type === "payment.failed" ||
    type === "payment.canceled" ||
    type === "payment.expired" ||
    event.data?.status === "failed" ||
    event.data?.status === "canceled"
  ) {
    if (tx.status === "pending") {
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { status: "failed" },
      });
    }
    return NextResponse.json({ ok: true, failed: true, reference: tx.reference });
  }

  return NextResponse.json({ ok: true, ignored: true, type });
}
