"use client";

import { useSession } from "@/lib/hooks/useSession";
import { PageLoader } from "@/components/layout/PageLoader";
import {
  Users,
  Calendar,
  CreditCard,
  ShieldCheck,
  Wallet,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

const stats = [
  { label: "Total Users", value: "0", icon: Users, href: "/admin/users", color: "text-primary" },
  { label: "Active Bookings", value: "0", icon: Calendar, href: "/admin/bookings", color: "text-accent" },
  { label: "Revenue Today", value: "₦0", icon: TrendingUp, href: "/admin/payments", color: "text-success" },
  { label: "Pending Verifications", value: "0", icon: ShieldCheck, href: "/admin/verifications", color: "text-yellow-600" },
  { label: "Pending Payments", value: "0", icon: CreditCard, href: "/admin/payments", color: "text-primary" },
  { label: "Pending Withdrawals", value: "0", icon: Wallet, href: "/admin/payments", color: "text-error" },
];

export default function AdminPage() {
  const { user, isLoading } = useSession();

  if (isLoading) return <PageLoader />;
  if (!user?.is_admin) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-text-secondary">Access denied</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-text-primary mb-6">
          Admin Overview
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link
                key={stat.label}
                href={stat.href}
                className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                  <span className="text-sm text-text-secondary">
                    {stat.label}
                  </span>
                </div>
                <p className="text-2xl font-semibold text-text-primary">
                  {stat.value}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
