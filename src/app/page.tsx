import { Hero } from "@/components/landing/Hero";
import { LiveRadarPreview } from "@/components/landing/LiveRadarPreview";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ServiceCategories } from "@/components/landing/ServiceCategories";
import { TrustSection } from "@/components/landing/TrustSection";
import { StatsBar } from "@/components/landing/StatsBar";
import { CTASection } from "@/components/landing/CTASection";
import { getPublicStats } from "@/lib/publicStats";

// Refresh the live numbers once an hour.
export const revalidate = 3600;

export const metadata = {
  title: "Skilled9ja - Find Verified Talent Near You",
  description:
    "Real-time. Verified. Skilled. Nigeria's trusted platform for finding artisans, home service providers, and professional talent.",
};

export default async function HomePage() {
  const stats = await getPublicStats();
  return (
    <>
      <Hero />
      <LiveRadarPreview />
      <ServiceCategories />
      <HowItWorks />
      <TrustSection />
      <StatsBar stats={stats} />
      <CTASection />
    </>
  );
}
