import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Skilled9ja - Find Verified Talent Near You",
  description: "Real-time. Verified. Skilled. Nigeria's trusted platform for finding artisans, home service providers, and professional talent.",
  metadataBase: new URL("https://skilled9ja.com"),
  openGraph: {
    title: "Skilled9ja - Find Verified Talent Near You",
    description: "Real-time. Verified. Skilled.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Header />
          <main className="min-h-[calc(100vh-200px)] pt-11">
            <AppShell>{children}</AppShell>
          </main>
          <Footer />
          <MobileNav />
        </Providers>
      </body>
    </html>
  );
}