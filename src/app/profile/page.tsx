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

  if (user.is_company && user.active_mode === "company") {
    // TODO: return <CompanyProfile />; — coming in Badge E
    return <ArtisanProfile />;
  }

  // Client fallback — TODO: return <ClientProfile />; — coming in Badge A part 2
  return <ArtisanProfile />;
}