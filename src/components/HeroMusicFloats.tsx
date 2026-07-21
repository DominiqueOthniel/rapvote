"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

type PropKind = "mic" | "speaker" | "headphones" | "vinyl" | "mixer";

type PropDef = {
  id: PropKind;
  label: string;
  className: string;
};

const PROPS: PropDef[] = [
  { id: "mic", label: "Micro", className: "hero-float--mic" },
  { id: "speaker", label: "Baffle", className: "hero-float--speaker" },
  { id: "headphones", label: "Casque", className: "hero-float--headphones" },
  { id: "vinyl", label: "Vinyle", className: "hero-float--vinyl" },
  { id: "mixer", label: "Table de mixage", className: "hero-float--mixer" },
];

function MicIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="micBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f7f2e8" />
          <stop offset="55%" stopColor="#cfc5b4" />
          <stop offset="100%" stopColor="#8d8375" />
        </linearGradient>
        <linearGradient id="micLime" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8ff7a" />
          <stop offset="100%" stopColor="#a8d61f" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="12" ry="3" fill="rgba(0,0,0,0.35)" />
      <rect x="29" y="38" width="6" height="14" rx="2" fill="url(#micLime)" />
      <path d="M20 28c0 6.6 5.4 12 12 12s12-5.4 12-12V18c0-6.6-5.4-12-12-12S20 11.4 20 18v10z" fill="url(#micBody)" />
      <path d="M24 18c0-4.4 3.6-8 8-8" stroke="#fff" strokeOpacity="0.45" strokeWidth="2" fill="none" />
      <rect x="22" y="20" width="20" height="3" rx="1.5" fill="rgba(0,0,0,0.18)" />
      <rect x="22" y="26" width="20" height="3" rx="1.5" fill="rgba(0,0,0,0.18)" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="spkBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2a2621" />
          <stop offset="100%" stopColor="#0f0d0b" />
        </linearGradient>
        <radialGradient id="spkCone" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#d6ff3f" />
          <stop offset="55%" stopColor="#8fad1a" />
          <stop offset="100%" stopColor="#3d470c" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="14" ry="3" fill="rgba(0,0,0,0.35)" />
      <rect x="12" y="8" width="40" height="48" rx="6" fill="url(#spkBody)" stroke="#e4b54a" strokeWidth="1.5" />
      <circle cx="32" cy="24" r="8" fill="url(#spkCone)" />
      <circle cx="32" cy="24" r="3" fill="#111" />
      <circle cx="32" cy="44" r="11" fill="url(#spkCone)" />
      <circle cx="32" cy="44" r="4.5" fill="#111" />
    </svg>
  );
}

function HeadphonesIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="hpMetal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0e8d8" />
          <stop offset="100%" stopColor="#9e9486" />
        </linearGradient>
        <linearGradient id="hpPad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d6ff3f" />
          <stop offset="100%" stopColor="#6f8f12" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="13" ry="3" fill="rgba(0,0,0,0.3)" />
      <path
        d="M12 36v-4c0-11 9-20 20-20s20 9 20 20v4"
        fill="none"
        stroke="url(#hpMetal)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <rect x="8" y="34" width="12" height="18" rx="5" fill="url(#hpPad)" />
      <rect x="44" y="34" width="12" height="18" rx="5" fill="url(#hpPad)" />
      <rect x="10" y="37" width="8" height="12" rx="3" fill="#111" opacity="0.35" />
      <rect x="46" y="37" width="8" height="12" rx="3" fill="#111" opacity="0.35" />
    </svg>
  );
}

function VinylIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <radialGradient id="vinylDisk" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#3a3530" />
          <stop offset="55%" stopColor="#151210" />
          <stop offset="100%" stopColor="#050403" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="14" ry="3" fill="rgba(0,0,0,0.3)" />
      <circle cx="32" cy="32" r="22" fill="url(#vinylDisk)" stroke="#e4b54a" strokeWidth="1.2" />
      <circle cx="32" cy="32" r="16" fill="none" stroke="rgba(244,239,230,0.12)" strokeWidth="1" />
      <circle cx="32" cy="32" r="11" fill="none" stroke="rgba(244,239,230,0.1)" strokeWidth="1" />
      <circle cx="32" cy="32" r="7" fill="#d6ff3f" />
      <circle cx="32" cy="32" r="2.2" fill="#111" />
    </svg>
  );
}

function MixerIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="mixBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2c2823" />
          <stop offset="100%" stopColor="#12100e" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="14" ry="3" fill="rgba(0,0,0,0.3)" />
      <rect x="8" y="14" width="48" height="36" rx="5" fill="url(#mixBody)" stroke="#e4b54a" strokeWidth="1.2" />
      <rect x="14" y="20" width="6" height="22" rx="2" fill="rgba(244,239,230,0.12)" />
      <rect x="29" y="20" width="6" height="22" rx="2" fill="rgba(244,239,230,0.12)" />
      <rect x="44" y="20" width="6" height="22" rx="2" fill="rgba(244,239,230,0.12)" />
      <circle cx="17" cy="28" r="4" fill="#d6ff3f" />
      <circle cx="32" cy="34" r="4" fill="#e4b54a" />
      <circle cx="47" cy="26" r="4" fill="#ff7900" />
    </svg>
  );
}

function PropIcon({ kind }: { kind: PropKind }) {
  switch (kind) {
    case "mic":
      return <MicIcon />;
    case "speaker":
      return <SpeakerIcon />;
    case "headphones":
      return <HeadphonesIcon />;
    case "vinyl":
      return <VinylIcon />;
    case "mixer":
      return <MixerIcon />;
  }
}

export function HeroMusicFloats() {
  const layerRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<PropKind | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    function onMove(e: PointerEvent) {
      const rect = layer.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      setTilt({
        x: Math.max(-1, Math.min(1, nx)),
        y: Math.max(-1, Math.min(1, ny)),
      });
    }

    function onLeave() {
      setTilt({ x: 0, y: 0 });
    }

    layer.addEventListener("pointermove", onMove);
    layer.addEventListener("pointerleave", onLeave);
    return () => {
      layer.removeEventListener("pointermove", onMove);
      layer.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={layerRef}
      className="hero-floats"
      aria-hidden="true"
      style={
        {
          "--tilt-x": String(tilt.x),
          "--tilt-y": String(tilt.y),
        } as CSSProperties
      }
    >
      {PROPS.map((prop) => (
        <button
          key={prop.id}
          type="button"
          className={`hero-float ${prop.className}${
            activeId === prop.id ? " is-pop" : ""
          }`}
          aria-label={prop.label}
          onClick={() => {
            setActiveId(prop.id);
            window.setTimeout(() => setActiveId(null), 650);
          }}
        >
          <span className="hero-float-orb" />
          <span className="hero-float-icon">
            <PropIcon kind={prop.id} />
          </span>
          <span className="hero-float-label">{prop.label}</span>
        </button>
      ))}
    </div>
  );
}
