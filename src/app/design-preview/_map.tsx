// TEMPORARY design-exploration mockup — see ./_shared.tsx for cleanup notes.
// A stylized fake map: streets, blocks, a highway, a river, and real
// teardrop pin markers with labels — so it reads as an actual live map
// instead of colored dots on graph paper. Still entirely static/
// illustrative — no real geocoding or tiles.

const PIN_HEX: Record<string, string> = {
  cyan: "#22d3ee",
  emerald: "#34d399",
  violet: "#a78bfa",
  amber: "#fbbf24",
};

export type MapPin = {
  label: string;
  tag?: string;
  top: string;
  left: string;
  color: "cyan" | "emerald" | "violet" | "amber";
  pulse?: boolean;
};

function PinMarker({ pin }: { pin: MapPin }) {
  const hex = PIN_HEX[pin.color];
  const tag = pin.tag ?? pin.label.split(" — ").pop() ?? pin.label;

  return (
    <>
      <div className="absolute z-10 -translate-x-1/2 -translate-y-full" style={{ top: pin.top, left: pin.left }}>
        <div className="relative">
          {pin.pulse && (
            <span
              className="absolute left-1/2 top-[11px] h-3 w-3 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full"
              style={{ backgroundColor: hex, opacity: 0.6 }}
            />
          )}
          <svg width="22" height="28" viewBox="0 0 22 28" style={{ filter: `drop-shadow(0 1px 5px ${hex})` }}>
            <path
              d="M11 0C4.9 0 0 4.9 0 11c0 8.25 11 17 11 17s11-8.75 11-17C22 4.9 17.1 0 11 0z"
              fill={hex}
            />
            <circle cx="11" cy="11" r="4" fill="#05070a" />
          </svg>
        </div>
      </div>
      <div className="absolute z-10 -translate-x-1/2 pt-1" style={{ top: pin.top, left: pin.left }}>
        <span className="block max-w-[92px] truncate rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-medium text-zinc-200 backdrop-blur-sm">
          {tag}
        </span>
      </div>
    </>
  );
}

export function MapPanel({ pins, className = "h-72" }: { pins: MapPin[]; className?: string }) {
  return (
    <div className={`relative ${className} overflow-hidden rounded-lg border border-white/5 bg-[#070a0f]`}>
      <svg viewBox="0 0 400 300" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {/* blocks */}
        <rect x="18" y="18" width="80" height="60" fill="white" opacity="0.05" />
        <rect x="120" y="16" width="60" height="40" fill="white" opacity="0.04" />
        <rect x="210" y="90" width="70" height="55" fill="white" opacity="0.05" />
        <rect x="300" y="20" width="80" height="50" fill="white" opacity="0.04" />
        <rect x="30" y="180" width="90" height="65" fill="white" opacity="0.04" />
        <rect x="230" y="200" width="60" height="45" fill="white" opacity="0.05" />

        {/* river */}
        <path
          d="M-20 210 C 90 170, 180 260, 420 190"
          stroke="#22d3ee"
          strokeOpacity="0.16"
          strokeWidth="14"
          fill="none"
        />

        {/* streets */}
        <path d="M0 60 H400" stroke="white" strokeOpacity="0.15" strokeWidth="1.5" />
        <path d="M0 145 H400" stroke="white" strokeOpacity="0.15" strokeWidth="1.5" />
        <path d="M0 245 H400" stroke="white" strokeOpacity="0.15" strokeWidth="1.5" />
        <path d="M65 0 V300" stroke="white" strokeOpacity="0.15" strokeWidth="1.5" />
        <path d="M170 0 V300" stroke="white" strokeOpacity="0.15" strokeWidth="1.5" />
        <path d="M290 0 V300" stroke="white" strokeOpacity="0.15" strokeWidth="1.5" />
        <path d="M355 0 V300" stroke="white" strokeOpacity="0.15" strokeWidth="1.5" />

        {/* highway */}
        <path d="M-20 270 L420 30" stroke="white" strokeOpacity="0.22" strokeWidth="4" />
        <path
          d="M-20 270 L420 30"
          stroke="#000"
          strokeOpacity="0.45"
          strokeWidth="0.75"
          strokeDasharray="6 6"
        />

        {/* road labels */}
        <text x="290" y="58" fill="white" fillOpacity="0.3" fontSize="8" letterSpacing="0.5">
          HOUSTON RD
        </text>
        <text x="230" y="140" fill="white" fillOpacity="0.3" fontSize="8" letterSpacing="0.5" transform="rotate(-31 230 140)">
          GA-49
        </text>
      </svg>

      <span className="absolute left-3 top-3 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        Byron
      </span>
      <span className="absolute bottom-3 right-4 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        Macon
      </span>

      {pins.map((pin) => (
        <PinMarker key={pin.label} pin={pin} />
      ))}
    </div>
  );
}
