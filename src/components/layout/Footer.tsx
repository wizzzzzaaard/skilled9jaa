"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { isCampaignPath } from "@/lib/campaigns";

export function Footer() {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();

  const links = [
    { label: "About", href: "/about" },
    { label: "Find Talent", href: "/find" },
    { label: "Home Service", href: "/homeservice" },
    { label: "Post a Job", href: "/jobs/post" },
  ];

  if (isCampaignPath(pathname)) return null;

  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image
              src="https://vqzvvupwhzjaahfqgron.supabase.co/storage/v1/object/public/skilled-niger-assets/marketplace/1000084258.webp"
              alt="Skilled9ja"
              width={32}
              height={32}
              className="object-contain"
            />
            <span className="text-sm font-semibold text-text-secondary">
              Skilled9ja
            </span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-6">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-text-secondary hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <p className="text-xs text-text-secondary">
            &copy; Skilled9ja {currentYear}
          </p>
        </div>
      </div>
    </footer>
  );
}
