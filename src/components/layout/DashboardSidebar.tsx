"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  Sparkles,
  LayoutDashboard, User, Calendar,
  Wallet, Settings, Briefcase, Search,
} from "lucide-react";
import { useSessionStore } from "@/store/sessionStore";
import { Skeleton } from "@/components/ui/Skeleton";

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user, isLoading } = useSessionStore();

  if (isLoading) {
    return (
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-100 min-h-screen sticky top-11 shrink-0">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Skeleton variant="circle" className="w-8 h-8 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
        </div>
        <nav className="p-3 space-y-0.5 flex-1">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </nav>
      </aside>
    );
  }

  if (!user || user.account_status !== "active") return null;

  // Hide sidebar on public/landing pages
  const hiddenPaths = ["/", "/about", "/homeservice", "/find", "/login", "/signup", "/suspended"];
  if (hiddenPaths.some((p) => pathname === p || pathname?.startsWith("/book") || pathname?.startsWith("/provider") || pathname?.startsWith("/company") || pathname?.startsWith("/bill"))) return null;

  const isArtisan = user.is_artisan && user.active_mode === "artisan";
  const isClient = !user.is_artisan && !user.is_company && !user.is_home_service_provider;

  const navItems = isArtisan
    ? [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Search", href: "/find", icon: Search },
        { label: "Jobs", href: "/jobs", icon: Briefcase },
        { label: "Profile", href: "/profile", icon: User },
        ...(user.payment_status !== "verified" ? [{ label: "Upgrade", href: "/upgrade", icon: Sparkles }] : []),
        { label: "Settings", href: "/settings", icon: Settings },
      ]
    : isClient
    ? [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Search", href: "/find", icon: Search },
        { label: "Profile", href: "/profile", icon: User },
        { label: "Settings", href: "/settings", icon: Settings },
      ]
    : [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Search", href: "/find", icon: Search },
        { label: "Profile", href: "/profile", icon: User },
        { label: "Bookings", href: "/bookings", icon: Calendar },
        { label: "Wallet", href: "/wallet", icon: Wallet },
        { label: "Jobs", href: "/jobs", icon: Briefcase },
        { label: "Settings", href: "/settings", icon: Settings },
      ];

  return (
    <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-100 min-h-screen sticky top-11 shrink-0">
      {/* User info */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
            {user.profile_image_url ? (
              <img src={user.profile_image_url} alt={user.full_name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-primary">
                {user.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-text-primary truncate">{user.full_name}</p>
            <p className="text-[10px] text-text-secondary capitalize">{user.active_mode?.replace("_", " ")}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="p-3 space-y-0.5 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/dashboard" && pathname?.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-text-secondary hover:bg-gray-50 hover:text-text-primary"
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={() => useSessionStore.getState().signOut()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <span>→</span> Log out
        </button>
      </div>
    </aside>
  );
}