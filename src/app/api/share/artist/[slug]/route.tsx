import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";
import { getActiveSeason, getCurrentPhase } from "@/lib/competition";
import { COMPETITION_NAME } from "@/lib/parcours";

export const runtime = "nodejs";

type Size = { width: number; height: number };

const SIZES: Record<string, Size> = {
  square: { width: 1080, height: 1080 },
  wide: { width: 1200, height: 630 },
};

async function loadCandidate(slug: string) {
  return prisma.candidate.findUnique({
    where: { slug },
    select: {
      stageName: true,
      photoUrl: true,
      city: true,
      slug: true,
    },
  });
}

function ShareCard(props: {
  stageName: string;
  photoUrl: string | null;
  city: string | null;
  phaseLabel: string | null;
  size: Size;
}) {
  const isSquare = props.size.width === props.size.height;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: isSquare ? 64 : 48,
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
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 22,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#d6ff3f",
            fontWeight: 700,
          }}
        >
          ForTheCulture
        </div>
        <div style={{ display: "flex", fontSize: 20, color: "#9a9185" }}>
          {COMPETITION_NAME}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: isSquare ? "column" : "row",
          alignItems: "center",
          gap: isSquare ? 36 : 40,
          flex: 1,
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            width: isSquare ? 320 : 220,
            height: isSquare ? 320 : 220,
            borderRadius: 8,
            overflow: "hidden",
            border: "2px solid rgba(214,255,63,0.35)",
            background: "#15120f",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 96,
            fontWeight: 700,
            color: "#d6ff3f",
          }}
        >
          {props.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={props.photoUrl}
              alt=""
              width={isSquare ? 320 : 220}
              height={isSquare ? 320 : 220}
              style={{ objectFit: "cover", width: "100%", height: "100%" }}
            />
          ) : (
            props.stageName.slice(0, 1).toUpperCase()
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            maxWidth: isSquare ? 820 : 680,
            alignItems: isSquare ? "center" : "flex-start",
            textAlign: isSquare ? "center" : "left",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: isSquare ? 64 : 52,
              fontWeight: 800,
              lineHeight: 1.05,
            }}
          >
            {props.stageName}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: isSquare ? 36 : 30,
              color: "#d6ff3f",
              fontWeight: 700,
            }}
          >
            Mon son est en ligne · vote ici
          </div>
          {props.phaseLabel || props.city ? (
            <div
              style={{
                display: "flex",
                fontSize: 22,
                color: "#9a9185",
              }}
            >
              {[props.phaseLabel, props.city].filter(Boolean).join(" · ")}
            </div>
          ) : null}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          paddingTop: 22,
          fontSize: 20,
          color: "#9a9185",
        }}
      >
        <div style={{ display: "flex" }}>Scanne / clique le lien</div>
        <div style={{ display: "flex", color: "#d6ff3f", fontWeight: 700 }}>
          Vote Mobile Money
        </div>
      </div>
    </div>
  );
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "wide" ? "wide" : "square";
  const size = SIZES[format];

  const candidate = await loadCandidate(slug);
  if (!candidate) {
    return new Response("Introuvable", { status: 404 });
  }

  const season = await getActiveSeason();
  const phase = season ? await getCurrentPhase(season.id) : null;
  const phaseLabel = phase
    ? `Épisode ${phase.number}`
    : null;

  let photoUrl: string | null = candidate.photoUrl;
  if (photoUrl && photoUrl.startsWith("/")) {
    const origin = new URL(request.url).origin;
    photoUrl = `${origin}${photoUrl}`;
  }

  return new ImageResponse(
    (
      <ShareCard
        stageName={candidate.stageName}
        photoUrl={photoUrl}
        city={candidate.city}
        phaseLabel={phaseLabel}
        size={size}
      />
    ),
    size,
  );
}
