"use client";

import Link from "next/link";
import Image from "next/image";
import type { NearProfile } from "@/types/find";

interface Props {
  profile: NearProfile;
  sub: string;
  fallbackLetter: string;
}

export function ProfileCircle({ profile, sub, fallbackLetter }: Props) {
  return (
    <Link href={`/provider/${profile.id}`} className="flex flex-col items-center gap-2 shrink-0 w-20">
      <div className="relative">
        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-sm bg-gray-100 flex items-center justify-center">
          {profile.profile_image_url ? (
            <Image
              src={profile.profile_image_url}
              alt={profile.full_name || ""}
              width={64}
              height={64}
              className="object-cover w-full h-full"
            />
          ) : (
            <span className="text-xl font-semibold text-primary">
              {fallbackLetter}
            </span>
          )}
        </div>
        {profile.distance_km !== undefined && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white border border-gray-100 text-[9px] font-semibold text-text-secondary px-1.5 py-0.5 rounded-full whitespace-nowrap shadow-sm">
            {profile.distance_km < 1
              ? `${(profile.distance_km * 1000).toFixed(0)}m`
              : `${profile.distance_km.toFixed(1)}km`}
          </span>
        )}
      </div>
      <div className="text-center">
        <p className="text-[11px] font-semibold text-text-primary leading-tight truncate w-20 text-center">
          {(profile.full_name || profile.company_name || "Unknown")
            .split(" ")
            .slice(0, 2)
            .join(" ")
            .toUpperCase()}
        </p>
        <p className="text-[10px] text-text-secondary truncate w-20 text-center">
          {sub}
        </p>
      </div>
    </Link>
  );
}