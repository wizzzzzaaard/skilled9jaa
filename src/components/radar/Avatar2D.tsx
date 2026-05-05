"use client";
import { motion } from "framer-motion";
import { RadarProfile } from "@/types/radar";

interface Avatar2DProps {
  profile: RadarProfile;
  cx: number;
  cy: number;
  onSelect: (p: RadarProfile) => void;
}

export function Avatar2D({ profile, cx, cy, onSelect }: Avatar2DProps) {
  const size = 5.5;
  const displayName = profile.company_name || profile.full_name || "?";
  const shortName = displayName.length > 12 ? displayName.slice(0, 11) + "…" : displayName;
  const initial = displayName.charAt(0).toUpperCase();
  const distLabel = profile.distance_km < 1
    ? `${(profile.distance_km * 1000).toFixed(0)}m`
    : `${profile.distance_km.toFixed(1)} km`;

  // Pick avatar color based on type
  const avatarBg = profile.is_company ? "#1B4332" : "#F3F4F6";
  const avatarFg = profile.is_company ? "#FFFFFF" : "#1B4332";

  return (
    <g
      onClick={() => onSelect(profile)}
      className="cursor-pointer"
      style={{ transformOrigin: `${cx}% ${cy}%` }}
    >
      <motion.g
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        {/* Shadow */}
        <circle
          cx={`${cx}%`}
          cy={`${cy + 0.8}%`}
          r={`${size + 0.3}%`}
          fill="rgba(0,0,0,0.06)"
        />

        {/* Avatar circle */}
        <circle
          cx={`${cx}%`}
          cy={`${cy}%`}
          r={`${size}%`}
          fill="white"
          stroke="#E5E7EB"
          strokeWidth="0.4"
        />

        {profile.profile_image_url || profile.company_logo_url ? (
          <>
            <clipPath id={`clip-${profile.id}`}>
              <circle cx={`${cx}%`} cy={`${cy}%`} r={`${size - 0.2}%`} />
            </clipPath>
            <image
              href={(profile.is_company ? profile.company_logo_url : null) || profile.profile_image_url || ""}
              x={`${cx - size + 0.2}%`}
              y={`${cy - size + 0.2}%`}
              width={`${(size - 0.2) * 2}%`}
              height={`${(size - 0.2) * 2}%`}
              clipPath={`url(#clip-${profile.id})`}
              preserveAspectRatio="xMidYMid slice"
            />
          </>
        ) : (
          <>
            <circle
              cx={`${cx}%`}
              cy={`${cy}%`}
              r={`${size - 0.2}%`}
              fill={avatarBg}
            />
            <text
              x={`${cx}%`}
              y={`${cy + 1.8}%`}
              textAnchor="middle"
              fontSize="5.5%"
              fill={avatarFg}
              fontWeight="700"
            >
              {initial}
            </text>
          </>
        )}

        {/* Name label */}
        <text
          x={`${cx}%`}
          y={`${cy + size + 3.2}%`}
          textAnchor="middle"
          fontSize="2.6%"
          fill="#111827"
          fontWeight="600"
        >
          {shortName}
        </text>

        {/* Distance label */}
        <text
          x={`${cx}%`}
          y={`${cy + size + 5.8}%`}
          textAnchor="middle"
          fontSize="2.2%"
          fill="#6B7280"
          fontWeight="400"
        >
          {distLabel}
        </text>
      </motion.g>
    </g>
  );
}