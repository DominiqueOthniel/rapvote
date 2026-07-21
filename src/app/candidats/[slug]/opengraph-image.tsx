import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";
import { COMPETITION_NAME } from "@/lib/parcours";

export const runtime = "nodejs";
export const alt = "Carte de partage artiste";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const candidate = await prisma.candidate.findUnique({
    where: { slug },
    select: { stageName: true, photoUrl: true, city: true },
  });

  const stageName = candidate?.stageName ?? "Artiste";
  const city = candidate?.city;
  let photoUrl = candidate?.photoUrl ?? null;
  if (photoUrl?.startsWith("/")) {
    // Relative local upload: OG image sans photo externe.
    photoUrl = null;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 48,
          background:
            "linear-gradient(160deg, #1a1612 0%, #0b0908 48%, #050403 100%)",
          color: "#f4efe6",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            color: "#d6ff3f",
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          <span style={{ display: "flex" }}>ForTheCulture</span>
          <span style={{ display: "flex", color: "#9a9185", fontWeight: 500 }}>
            {COMPETITION_NAME}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 40,
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 220,
              height: 220,
              borderRadius: 8,
              overflow: "hidden",
              border: "2px solid rgba(214,255,63,0.35)",
              background: "#15120f",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 84,
              fontWeight: 700,
              color: "#d6ff3f",
            }}
          >
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt=""
                width={220}
                height={220}
                style={{ objectFit: "cover", width: "100%", height: "100%" }}
              />
            ) : (
              stageName.slice(0, 1).toUpperCase()
            )}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              maxWidth: 700,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 52,
                fontWeight: 800,
                lineHeight: 1.05,
              }}
            >
              {stageName}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 30,
                color: "#d6ff3f",
                fontWeight: 700,
              }}
            >
              Mon son est en ligne · vote ici
            </div>
            {city ? (
              <div style={{ display: "flex", fontSize: 22, color: "#9a9185" }}>
                {city}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
