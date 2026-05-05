"use client";
import { Avatar2D } from "./Avatar2D";
import { RadarProfile } from "@/types/radar";
import { getRingForDistance } from "@/lib/utils/distance";

// Ring radii as % of viewbox — elliptical like the design
const RINGS = [
  { rx: 18, ry: 10, label: "0.5 km" },
  { rx: 30, ry: 17, label: "1 km" },
  { rx: 42, ry: 24, label: "1.5 km" },
  { rx: 54, ry: 31, label: "2 km" },
  { rx: 66, ry: 38, label: "3.5 km" },
  { rx: 78, ry: 45, label: "5 km" },
];

interface RadarMap2DProps {
  profiles: RadarProfile[];
  onSelect: (p: RadarProfile) => void;
}

export function RadarMap2D({ profiles, onSelect }: RadarMap2DProps) {
  // Group by ring
  const grouped: Record<number, RadarProfile[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  profiles.forEach((p) => {
    const ring = Math.min(p.ring || getRingForDistance(p.distance_km), 6);
    if (!grouped[ring]) grouped[ring] = [];
    grouped[ring].push(p);
  });

  // Place avatars on elliptical rings
  const placed: Array<RadarProfile & { cx: number; cy: number }> = [];

  Object.entries(grouped).forEach(([ringNum, items]) => {
    const ringIndex = Number(ringNum) - 1;
    const ring = RINGS[ringIndex];
    if (!ring) return;

    items.forEach((item, i) => {
      const total = items.length;
      const angleOffset = ringIndex * 37; // stagger between rings
      const angle = total === 1
        ? angleOffset + 45
        : (i / total) * 360 + angleOffset;
      const rad = (angle * Math.PI) / 180;

      // Elliptical placement
      const cx = 50 + ring.rx * Math.sin(rad);
      const cy = 50 - ring.ry * Math.cos(rad);
      placed.push({ ...item, cx, cy });
    });
  });

  return (
    <div
      className="relative w-full select-none"
      style={{ aspectRatio: "1/1.1" }}
    >
      <svg
        viewBox="0 0 100 110"
        className="w-full h-full"
        style={{ overflow: "visible" }}
      >
        {/* Background subtle gradient */}
        <defs>
          <radialGradient id="radarBg" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#F9FAFB" />
            <stop offset="100%" stopColor="#F3F4F6" />
          </radialGradient>
        </defs>
        <ellipse cx="50" cy="50" rx="85" ry="52" fill="url(#radarBg)" />

        {/* Rings */}
        {RINGS.map((ring, i) => (
          <g key={i}>
            <ellipse
              cx="50"
              cy="50"
              rx={ring.rx}
              ry={ring.ry}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="0.25"
            />
            {/* Ring label on the right side */}
            <text
              x={50 + ring.rx + 1}
              y={50}
              fontSize="2"
              fill="#9CA3AF"
              fontWeight="400"
              dominantBaseline="middle"
            >
              {ring.label}
            </text>
          </g>
        ))}

        {/* "You" center marker */}
        <circle cx="50" cy="50" r="6" fill="#1B4332" />
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="2.8"
          fill="white"
          fontWeight="700"
        >
          You
        </text>

        {/* Profiles */}
        {placed.map((p) => (
          <Avatar2D
            key={p.id}
            profile={p}
            cx={p.cx}
            cy={p.cy}
            onSelect={onSelect}
          />
        ))}
      </svg>
    </div>
  );
}