import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch("https://api.ipify.org?format=json", {
      cache: "no-store",
    });
    const data = (await res.json()) as { ip?: string };
    const ip = data.ip ?? null;

    return NextResponse.json({
      ok: Boolean(ip),
      outboundIp: ip,
      hint: ip
        ? `Ajoute ${ip} sur https://business.notchpay.co/settings/developer/ips puis réessaie le versement.`
        : "Impossible de détecter l'IP sortante Netlify.",
      note: "Sur Netlify l'IP peut changer. Si ça casse souvent, demande à Notch de désactiver le filtre IP ou d'autoriser une plage.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        outboundIp: null,
        message: error instanceof Error ? error.message : "Erreur IP",
      },
      { status: 500 },
    );
  }
}
