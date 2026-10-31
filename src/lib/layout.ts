import { isCampaignPath } from "@/lib/campaigns";

/**
 * Pages that draw their own minimal header (landing pages, signup, payment),
 * so the site header, footer, bottom nav and dashboard sidebar stay hidden.
 */
export function hidesSiteChrome(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return isCampaignPath(pathname) || pathname === "/signup" || pathname.startsWith("/signup/") || pathname === "/upgrade";
}
