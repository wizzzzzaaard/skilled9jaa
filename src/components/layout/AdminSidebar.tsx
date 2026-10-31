"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  CreditCard,
  Calendar,
  Settings,
  Layers,
  Database,
  Megaphone,
  ArrowLeft,
  Link2,
} from "lucide-react";

const navItems = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Verifications", href: "/admin/verifications", icon: ShieldCheck },
  { label: "Payments", href: "/admin/payments", icon: CreditCard },
  { label: "Bookings", href: "/admin/bookings", icon: Calendar },
  { label: "Categories", href: "/admin/categories", icon: Layers },
  { label: "Mocks", href: "/admin/mocks", icon: Database },
  { label: "Broadcasts", href: "/admin/broadcasts", icon: Megaphone },
  { label: "Campaign links", href: "/admin/campaigns", icon: Link2 },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-primary min-h-screen sticky top-0">
      <div className="p-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-white/80 hover:text-white text-sm font-semibold mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Site
        </Link>

        <h2 className="text-white font-semibold text-lg mb-4">Admin</h2>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
