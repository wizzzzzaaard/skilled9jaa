"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard, Users, ShieldCheck, CreditCard, Calendar, Settings, Layers, Megaphone,
  ArrowLeft, Link2, Briefcase, BarChart3, History, Menu, X,
} from "lucide-react";

const groups = [
  {
    label: "Run the platform",
    items: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard },
      { label: "Members", href: "/admin/users", icon: Users },
      { label: "Jobs", href: "/admin/jobs", icon: Briefcase },
      { label: "Verifications", href: "/admin/verifications", icon: ShieldCheck },
      { label: "Payments", href: "/admin/payments", icon: CreditCard },
      { label: "Bookings", href: "/admin/bookings", icon: Calendar },
    ],
  },
  {
    label: "Grow",
    items: [
      { label: "Reports", href: "/admin/reports", icon: BarChart3 },
      { label: "Campaign links", href: "/admin/campaigns", icon: Link2 },
      { label: "Broadcasts", href: "/admin/broadcasts", icon: Megaphone },
    ],
  },
  {
    label: "Set up",
    items: [
      { label: "Categories", href: "/admin/categories", icon: Layers },
      { label: "Audit log", href: "/admin/audit", icon: History },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

function Nav({ pathname, onPick }: { pathname: string; onPick?: () => void }) {
  return (
    <nav aria-label="Admin">
      {groups.map((g) => (
        <div key={g.label} className="mb-5">
          <p className="px-4 mb-1 text-xs font-semibold text-white/60">{g.label}</p>
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onPick}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold",
                      active ? "bg-white/20 text-white" : "text-white/75 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminSidebar() {
  const pathname = usePathname() ?? "/admin";
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const back = (
    <Link href="/" className="flex items-center gap-2 text-white/80 hover:text-white text-sm font-semibold">
      <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to site
    </Link>
  );

  return (
    <>
      {/* Phones: a top bar with a menu button */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between bg-primary px-4 h-14">
        <span className="text-white font-semibold">Skilled9ja admin</span>
        <button type="button" onClick={() => setOpen(true)} className="text-white p-2 -mr-2" aria-label="Open admin menu" aria-expanded={open}>
          <Menu className="w-6 h-6" aria-hidden="true" />
        </button>
      </div>
      {open && (
        <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-primary p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              {back}
              <button type="button" onClick={() => setOpen(false)} className="text-white p-2" aria-label="Close menu">
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <Nav pathname={pathname} onPick={() => setOpen(false)} />
          </div>
        </div>
      )}

      {/* Larger screens: the sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-primary min-h-screen sticky top-0 self-start max-h-screen overflow-y-auto">
        <div className="p-4">
          <div className="mb-6">{back}</div>
          <h2 className="text-white font-semibold text-lg mb-4 px-4">Admin</h2>
          <Nav pathname={pathname} />
        </div>
      </aside>
    </>
  );
}
