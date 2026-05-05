import { Hero } from "@/components/landing/Hero";
import { LiveRadarPreview } from "@/components/landing/LiveRadarPreview";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ServiceCategories } from "@/components/landing/ServiceCategories";
import { TrustSection } from "@/components/landing/TrustSection";
import { StatsBar } from "@/components/landing/StatsBar";
import { CTASection } from "@/components/landing/CTASection";

export const metadata = {
  title: "Skilled9ja - Find Verified Talent Near You",
  description:
    "Real-time. Verified. Skilled. Nigeria's trusted platform for finding artisans, home service providers, and professional talent.",
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <LiveRadarPreview />
      <ServiceCategories />
      <HowItWorks />
      <TrustSection />
      <StatsBar />
      <CTASection />
    </>
  );
}
