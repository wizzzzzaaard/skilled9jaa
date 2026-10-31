"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hidesSiteChrome } from "@/lib/layout";
import { Chrome as Home, Search, Calendar, Wallet, User, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useSessionStore } from "@/store/sessionStore";
import { Skeleton } from "@/components/ui/Skeleton";

export function MobileNav() {
  const pathname = usePathname();
  const { user, isLoading } = useSessionStore();

  if (hidesSiteChrome(pathname)) return null;

  if (isLoading) {
    return (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 pb-safe">
        <div className="flex items-center justify-around h-14">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1 py-2 px-3">
              <Skeleton variant="circle" className="w-5 h-5" />
            </div>
          ))}
        </div>
      </nav>
    );
  }

  if (!user) return null;
  if (user.account_status !== "active") return null;

  const isArtisan = user.is_artisan && user.active_mode === "artisan";
  const isClientOrCompany = user.active_mode === "client" || user.active_mode === "company";

  const navItems = isArtisan
    ? [
        { label: "Home", href: "/dashboard", icon: Home },
        { label: "Search", href: "/find", icon: Search },
        { label: "Jobs", href: "/jobs", icon: Briefcase },
        { label: "Profile", href: "/profile", icon: User },
      ]
    : isClientOrCompany
    ? [
        { label: "Home", href: "/dashboard", icon: Home },
        { label: "Search", href: "/find", icon: Search },
        { label: "Profile", href: "/profile", icon: User },
      ]
    : [
        { label: "Home", href: "/dashboard", icon: Home },
        { label: "Search", href: "/find", icon: Search },
        { label: "Bookings", href: "/bookings", icon: Calendar },
        { label: "Wallet", href: "/wallet", icon: Wallet },
        { label: "Profile", href: "/profile", icon: User },
      ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 pb-safe">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname?.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-3 transition-colors",
                isActive ? "text-primary" : "text-gray-400"
              )}
            >
              <Icon className="w-5 h-5" />
              <span
                className={cn(
                  "text-[10px] font-semibold transition-opacity",
                  isActive ? "opacity-100" : "opacity-0"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
