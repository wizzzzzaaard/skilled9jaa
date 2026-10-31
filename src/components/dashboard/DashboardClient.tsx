"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/hooks/useSession";
import { useLocationStore } from "@/store/locationStore";
import { useDashboardData } from "@/lib/hooks/useDashboardData";
import { PageLoader } from "@/components/layout/PageLoader";
import { RadarMap2D } from "@/components/radar/RadarMap2D";
import { RadarMap3D } from "@/components/radar/RadarMap3D";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardTitle } from "./DashboardTitle";
import { ViewToggle } from "./ViewToggle";
import { RadarLoading } from "./RadarLoading";
import { ProfileOverlay } from "./ProfileOverlay";
import { WelcomeChecklist } from "./WelcomeChecklist";
import type { RadarProfile } from "@/types/radar";

export function DashboardClient() {
  const router = useRouter();
  const { user, isLoading } = useSession();
  const { latitude, longitude, city, state, requestLocation } = useLocationStore();
  const [selected, setSelected] = useState<RadarProfile | null>(null);
  const [view, setView] = useState<"2d" | "3d">("2d");

  const userLat = latitude || 6.5244;
  const userLng = longitude || 3.3792;

  const { profiles, dataLoading } = useDashboardData(user, userLat, userLng);

  useEffect(() => {
    requestLocation();
  }, []);

  useEffect(() => {
    if (isLoading || !user) return;
    const status = user.account_status;
    if (status === "incomplete") {
      router.replace(`/signup?resume=true&step=${user.signup_step || 1}`);
    } else if (status === "pending_manual" || status === "pending_verify") {
      router.replace("/signup/pending");
    } else if (status === "pending_payment") {
      router.replace("/signup?resume=true&step=payment");
    } else if (status === "suspended") {
      router.replace("/suspended");
    }
  }, [user, isLoading]);

  if (isLoading) return <PageLoader />;
  if (!user) return <PageLoader />;
  if (user.account_status !== "active") return <PageLoader />;

  const locationLabel = (city && state)
    ? `${city}, ${state}`
    : city || state || user.city || user.state || "Nigeria";

  const isArtisanMode = user.is_artisan && user.active_mode === "artisan";
  const title    = isArtisanMode ? "Companies near you" : "Professionals near you";
  const subtitle = dataLoading
    ? "Finding the 15 closest to you..."
    : isArtisanMode
    ? `${profiles.length} closest companies`
    : `${profiles.length} closest verified professionals`;

  return (
    <div className="min-h-screen bg-white pb-20 overflow-hidden">
      <DashboardHeader locationLabel={locationLabel} />
      <WelcomeChecklist user={user} />
      <DashboardTitle title={title} subtitle={subtitle} />
      <ViewToggle view={view} onChange={setView} />
      <div className="px-4">
        {dataLoading ? (
          <RadarLoading />
        ) : view === "2d" ? (
          <RadarMap2D profiles={profiles} onSelect={setSelected} />
        ) : (
          <RadarMap3D profiles={profiles} onSelect={setSelected} />
        )}
      </div>
      <ProfileOverlay selected={selected} onClose={() => setSelected(null)} />
    </div>
  );
}