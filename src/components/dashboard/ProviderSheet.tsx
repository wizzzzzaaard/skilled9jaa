"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { MapPin, X, CheckCircle, Briefcase } from "lucide-react";
import { RadarProfile } from "@/types/radar";

interface ProviderSheetProps {
  profile: RadarProfile;
  onClose: () => void;
}

export function ProviderSheet({ profile, onClose }: ProviderSheetProps) {
  const isCompanyCard = profile.is_company;

  const displayName = isCompanyCard
    ? (profile.company_name || profile.full_name || "Company")
    : (profile.full_name || "Unknown");

  const sub = isCompanyCard
    ? (profile.city && profile.state ? `${profile.city}, ${profile.state}` : profile.state || "")
    : (profile.skill || profile.job_role || "");

  const distanceLabel = profile.distance_km < 1
    ? `${(profile.distance_km * 1000).toFixed(0)}m away`
    : `${profile.distance_km.toFixed(1)}km away`;

  const locationLabel = profile.city
    ? `${profile.city}${profile.state ? `, ${profile.state}` : ""}`
    : profile.state || "";

  const profileUrl = isCompanyCard
    ? `/company/${profile.company_slug || profile.id}`
    : `/provider/${profile.id}`;

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl shadow-2xl"
      style={{ maxHeight: "65vh", paddingBottom: "calc(3.5rem + env(safe-area-inset-bottom))" }}
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 bg-gray-200 rounded-full" />
      </div>

      <div className="px-5 pb-6">
        {profile.is_mock ? (
          <div className="text-center py-6">
            <p className="text-3xl mb-3">👋</p>
            <h3 className="text-base font-semibold text-text-primary mb-2">Demo Profile</h3>
            <p className="text-sm text-text-secondary mb-5 leading-relaxed">
              This is a demo profile showing how Skilled9ja works. Real professionals near you are joining every day.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: "Skilled9ja", text: "Find verified talent near you", url: window.location.origin });
                  }
                }}
                className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-sm font-semibold text-text-secondary"
              >
                Share App
              </button>
              <Link href="/find" className="flex-1">
                <button className="w-full py-3 rounded-2xl bg-primary text-white text-sm font-semibold">
                  Explore
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-4 mb-4">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
                {(isCompanyCard ? profile.company_logo_url : null) || profile.profile_image_url ? (
                  <Image
                    src={(isCompanyCard ? profile.company_logo_url : null) || profile.profile_image_url!}
                    alt={displayName}
                    width={64}
                    height={64}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span className="text-2xl font-bold text-primary">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-bold text-text-primary text-base">{displayName}</h3>
                  {profile.verification_status === "verified" && (
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </div>

                {sub && <p className="text-sm text-text-secondary truncate mt-0.5">{sub}</p>}

                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-primary" />
                  <span className="text-xs text-text-secondary">
                    {distanceLabel}
                    {locationLabel ? ` · ${locationLabel}` : ""}
                  </span>
                </div>

                {/* Company-specific badges */}
                {isCompanyCard && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {profile.is_hiring && (
                      <span className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        <Briefcase className="w-3 h-3" /> Hiring
                      </span>
                    )}
                    {profile.verification_status === "verified" && (
                      <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                        <CheckCircle className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>
                )}

                {/* Artisan skill badge */}
                {!isCompanyCard && (profile.skill || profile.job_role) && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {profile.skill && (
                      <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">
                        {profile.skill}
                      </span>
                    )}
                    {profile.job_role && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                        {profile.job_role}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <button onClick={onClose} className="p-2 rounded-full bg-gray-100 shrink-0">
                <X className="w-4 h-4 text-text-secondary" />
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Link href={profileUrl} className="flex-1">
                <button className="w-full py-3 rounded-2xl bg-primary text-white text-sm font-bold">
                  View Profile
                </button>
              </Link>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}