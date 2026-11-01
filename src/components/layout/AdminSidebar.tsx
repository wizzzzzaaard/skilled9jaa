"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard, Users, ShieldCheck, CreditCard, Calendar, Settings, Layers, Megaphone,
  ArrowLeft, Link2, Briefcase, BarChart3, History, Menu, X, Flag, AlertTriangle, Wallet,
  RefreshCw, UserCog, FileLock2, KeyRound,
} from "lucide-react";
import { OWNER_PATHS, useAdminRole, useWaitingCounts, type WaitingCounts } from "@/lib/adminMe";

type Item = { label: string; href: string; icon: typeof Users; badge?: keyof WaitingCounts };
const groups: { label: string; items: Item[] }[] = [
  {
    label: "Run the platform",
    items: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard },
      { label: "Members", href: "/admin/users", icon: Users },
      { label: "Jobs", href: "/admin/jobs", icon: Briefcase },
      { label: "Reports & moderation", href: "/admin/moderation", icon: Flag, badge: "reports" },
      { label: "ID checks", href: "/admin/verifications", icon: ShieldCheck, badge: "verifications" },
      { label: "Bookings", href: "/admin/bookings", icon: Calendar },
      { label: "Fraud warnings", href: "/admin/risk", icon: AlertTriangle },
    ],
  },
  {
    label: "Money",
    items: [
      { label: "Payments", href: "/admin/payments", icon: CreditCard, badge: "transfers" },
      { label: "Withdrawals", href: "/admin/withdrawals", icon: Wallet, badge: "withdrawals" },
      { label: "Renewals", href: "/admin/renewals", icon: RefreshCw },
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
      { label: "Admin team", href: "/admin/team", icon: UserCog },
      { label: "Data requests", href: "/admin/data-requests", icon: FileLock2, badge: "dataRequests" },
      { label: "Audit log", href: "/admin/audit", icon: History },
      { label: "Two-step login", href: "/admin/security", icon: KeyRound },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

function Nav({ pathname, onPick, counts, owner }: { pathname: string; onPick?: () => void; counts: WaitingCounts; owner: boolean }) {
  return (
    <nav aria-label="Admin">
      {groups.map((g) => {
        const items = g.items.filter((i) => owner || !OWNER_PATHS.includes(i.href));
        if (!items.length) return null;
        return (
          <div key={g.label} className="mb-5">
            <p className="px-4 mb-1 text-xs font-semibold text-white/60">{g.label}</p>
            <ul className="space-y-0.5">
              {items.map((item) => {
                const active = item.href === "/admin" ? pathname === "/admin" : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                const n = item.badge ? counts[item.badge] : null;
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
                      <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                      <span className="flex-1">{item.label}</span>
                      {!!n && (
                        <span className="min-w-[1.5rem] text-center rounded-full bg-[#F4B400] text-[#10301f] text-xs font-bold px-1.5 py-0.5">
                          {n > 99 ? "99+" : n}
                          <span className="sr-only"> waiting</span>
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export function AdminSidebar() {
  const pathname = usePathname() ?? "/admin";
  const [open, setOpen] = useState(false);
  const counts = useWaitingCounts();
  const role = useAdminRole();
  const owner = role !== "support";
  const waiting = (counts.reports ?? 0) + (counts.transfers ?? 0) + (counts.verifications ?? 0) + (owner ? (counts.withdrawals ?? 0) + (counts.dataRequests ?? 0) : 0);
  // Show the waiting total in the browser tab, e.g. "(3) Skilled9ja".
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\+?\)\s*/, "");
    document.title = waiting ? `(${waiting > 99 ? "99+" : waiting}) ${base}` : base;
  }, [waiting, pathname]);
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
        <span className="text-white font-semibold">Skilled9ja admin{waiting ? <span className="ml-2 rounded-full bg-[#F4B400] text-[#10301f] text-xs font-bold px-1.5 py-0.5">{waiting}<span className="sr-only"> waiting</span></span> : null}</span>
        <button type="button" onClick={() => setOpen(true)} className="text-white p-2 -mr-2" aria-label="Open admin menu" aria-expanded={open}>
          <Menu className="w-6 h-6" aria-hidden="true" />
        </button>
      </div>
      {open && (
        <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Admin menu">
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-primary p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              {back}
              <button type="button" onClick={() => setOpen(false)} className="text-white p-2" aria-label="Close menu">
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <Nav pathname={pathname} onPick={() => setOpen(false)} counts={counts} owner={owner} />
          </div>
        </div>
      )}

      {/* Larger screens: the sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-primary min-h-screen sticky top-0 self-start max-h-screen overflow-y-auto">
        <div className="p-4">
          <div className="mb-6">{back}</div>
          <h2 className="text-white font-semibold text-lg mb-4 px-4">Admin</h2>
          <Nav pathname={pathname} counts={counts} owner={owner} />
        </div>
      </aside>
    </>
  );
}
