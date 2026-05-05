import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About - Skilled9ja",
  description: "Learn about Skilled9ja, Nigeria's trusted talent platform",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl md:text-4xl font-semibold text-text-primary mb-6">
          About Skilled9ja
        </h1>

        <div className="space-y-6 text-text-secondary leading-relaxed">
          <p>
            Skilled9ja is Nigeria&apos;s trusted platform for finding and booking
            verified artisans, home service providers, and professional talent.
            We believe that everyone deserves access to safe, reliable services
            at fair prices.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-8 mb-4">
            Our Mission
          </h2>
          <p>
            To connect Nigerians with verified, skilled professionals while
            ensuring safety, transparency, and fair compensation for service
            providers.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-8 mb-4">
            How We Verify
          </h2>
          <p>
            Every service provider on our platform undergoes National
            Identification Number (NIN) verification. We also implement a
            trustee notification system and escrow-based payments to ensure
            maximum safety for all parties.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-8 mb-4">
            Coverage
          </h2>
          <p>
            We operate across all 36 states in Nigeria, with a growing network
            of over 950 verified professionals ready to serve you.
          </p>
        </div>
      </div>
    </div>
  );
}
