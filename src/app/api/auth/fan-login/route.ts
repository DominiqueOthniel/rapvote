import { NextResponse } from "next/server";
import { z } from "zod";
import { createFanSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizeCameroonPhone } from "@/lib/money";

const schema = z.object({
  name: z.string().trim().min(2).max(60),
  phone: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Nom (2+ lettres) et numéro requis" },
        { status: 400 },
      );
    }

    const phone = normalizeCameroonPhone(parsed.data.phone);
    if (!phone.startsWith("237") || phone.length !== 12) {
      return NextResponse.json(
        { error: "Numéro camerounais invalide. Exemple: 6XX XXX XXX" },
        { status: 400 },
      );
    }

    const fan = await prisma.fan.upsert({
      where: { phone },
      create: {
        phone,
        name: parsed.data.name.trim(),
      },
      update: {
        name: parsed.data.name.trim(),
      },
    });

    await createFanSession(fan.id);

    return NextResponse.json({
      ok: true,
      fan: { id: fan.id, name: fan.name, phone: fan.phone },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Connexion fan impossible" },
      { status: 500 },
    );
  }
}
