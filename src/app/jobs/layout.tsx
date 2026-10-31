import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jobs in Nigeria near you | Skilled9ja",
  description: "Browse open jobs by state, pay and perks like accommodation, feeding and transport allowance. Apply free from your phone.",
  alternates: { canonical: "/jobs" },
};

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
