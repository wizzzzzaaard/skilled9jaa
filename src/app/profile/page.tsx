"use client";
import { useSession } from "@/lib/hooks/useSession";
import { PageLoader } from "@/components/layout/PageLoader";
import { ArtisanProfile } from "@/components/profile/artisan/ArtisanProfile";

export default function ProfilePage() {
const { user, isLoading } = useSession();
  if (isLoading) return <PageLoader />;
  if (!user) return <PageLoader />;

  if (user.is_artisan && user.active_mode === "artisan") {
    return <ArtisanProfile />;
  }

  // fallback — will expand for company/client later
  return <ArtisanProfile />;
}