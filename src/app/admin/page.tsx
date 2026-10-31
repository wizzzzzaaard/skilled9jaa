"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/hooks/useSession";
import { PageLoader } from "@/components/layout/PageLoader";

interface Overview {
  members: number;
  today: number;
  week: number;
  byStatus: Record<string, number>;
  paid: number;
  daily: { day: string; label: string; n: number }[];
  revenueAll: number;
  revenueMonth: number;
  pendingTransfers: number;
  pendingTransferSum: number;
  pendingOrders: number;
  openJobs: number;
  pendingVerifications: number | null;
}

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;
const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  incomplete: "Unfinished signup",
  pending_payment: "Stuck at payment",
  pending_manual: "Waiting for transfer check",
  pending_verify: "Waiting for ID check",
  suspended: "Suspended",
  rejected: "Rejected",
};

export default function AdminPage() {
  const { user, isLoading } = useSession();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.is_admin) return;
    (async () => {
      const supabase = createClient();
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [profiles, transfers, orders, jobs, verifications] = await Promise.all([
        supabase.from("profiles").select("created_at, account_status, payment_status").eq("is_mock", false).limit(20000),
        supabase.from("user_payments").select("amount, status, created_at, approved_at").limit(20000),
        supabase.from("orders").select("amount, status, created_at, approved_at").limit(20000),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("verifications").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      if (profiles.error) {
        setError("Couldn't load the numbers. Check that you're signed in as an admin.");
        return;
      }

      const rows = (profiles.data ?? []) as { created_at: string; account_status: string; payment_status: string | null }[];
      const now = Date.now();
      const dayKey = (d: Date) => d.toISOString().slice(0, 10);
      const daily = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(now - (13 - i) * 86_400_000);
        return { day: dayKey(d), label: d.toLocaleDateString("en-NG", { day: "numeric", month: "short" }), n: 0 };
      });
      const byDay = new Map(daily.map((d) => [d.day, d]));
      const byStatus: Record<string, number> = {};
      let today = 0;
      let week = 0;
      for (const r of rows) {
        byStatus[r.account_status] = (byStatus[r.account_status] ?? 0) + 1;
        const t = new Date(r.created_at).getTime();
        if (now - t < 86_400_000) today++;
        if (now - t < 7 * 86_400_000) week++;
        const slot = byDay.get(r.created_at.slice(0, 10));
        if (slot) slot.n++;
      }

      type Pay = { amount: number; status: string; created_at: string; approved_at: string | null };
      const tx = (transfers.data ?? []) as Pay[];
      const ord = (orders.data ?? []) as Pay[];
      const paidRows = [...tx.filter((t) => t.status === "approved"), ...ord.filter((o) => o.status === "verified")];
      const inMonth = (p: Pay) => new Date(p.approved_at ?? p.created_at) >= startOfMonth;

      setData({
        members: rows.length,
        today,
        week,
        byStatus,
        paid: rows.filter((r) => r.payment_status === "verified").length,
        daily,
        revenueAll: paidRows.reduce((s, p) => s + Number(p.amount || 0), 0),
        revenueMonth: paidRows.filter(inMonth).reduce((s, p) => s + Number(p.amount || 0), 0),
        pendingTransfers: tx.filter((t) => t.status === "pending").length,
        pendingTransferSum: tx.filter((t) => t.status === "pending").reduce((s, p) => s + Number(p.amount || 0), 0),
        pendingOrders: ord.filter((o) => o.status === "pending").length,
        openJobs: jobs.count ?? 0,
        pendingVerifications: verifications.error ? null : verifications.count ?? 0,
      });
    })();
  }, [user?.is_admin]);

  if (isLoading) return <PageLoader />;
  if (!user?.is_admin) return <div className="p-8 text-text-secondary">Admins only.</div>;

  const max = data ? Math.max(1, ...data.daily.map((d) => d.n)) : 1;
  const tile = (label: string, value: string, note?: string, href?: string) => {
    const body = (
      <>
        <p className="text-sm text-text-secondary">{label}</p>
        <p className="text-2xl font-semibold text-text-primary mt-1">{value}</p>
        {note && <p className="text-xs text-text-secondary mt-1">{note}</p>}
      </>
    );
    return href ? (
      <Link href={href} className="block bg-white rounded-xl border border-gray-100 p-5 hover:border-primary/40">{body}</Link>
    ) : (
      <div className="bg-white rounded-xl border border-gray-100 p-5">{body}</div>
    );
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <h1 className="text-2xl font-semibold text-text-primary">Overview</h1>
      <p className="text-sm text-text-secondary mt-1">Real members only (mock profiles left out).</p>

      {error && <p className="mt-6 text-sm font-semibold text-red-700" role="alert">{error}</p>}
      {!data && !error && <p className="mt-6 text-text-secondary" role="status">Loading numbers…</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            {tile("Members", data.members.toLocaleString("en-NG"), `${data.today} today, ${data.week} this week`, "/admin/users")}
            {tile("Paid members", data.paid.toLocaleString("en-NG"), `${data.members ? Math.round((data.paid / data.members) * 100) : 0}% of members`)}
            {tile("Revenue this month", naira(data.revenueMonth), `${naira(data.revenueAll)} all time`, "/admin/payments")}
            {tile("Transfers to check", data.pendingTransfers.toLocaleString("en-NG"), data.pendingTransfers ? `${naira(data.pendingTransferSum)} waiting` : "None waiting", "/admin/payments")}
            {tile("Open jobs", data.openJobs.toLocaleString("en-NG"))}
            {tile("Card payments not confirmed", data.pendingOrders.toLocaleString("en-NG"), "Check these against Paystack", "/admin/payments")}
            {tile("ID checks waiting", data.pendingVerifications === null ? "–" : data.pendingVerifications.toLocaleString("en-NG"), undefined, "/admin/verifications")}
            {tile("Campaign links", "Open", "Signups per landing page", "/admin/campaigns")}
          </div>

          <div className="grid lg:grid-cols-2 gap-4 mt-6">
            <section className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="font-semibold text-text-primary">New members, last 14 days</h2>
              <ol className="mt-4 space-y-1.5">
                {data.daily.map((d) => (
                  <li key={d.day} className="grid grid-cols-[4.5rem_1fr_2rem] items-center gap-2 text-sm">
                    <span className="text-text-secondary">{d.label}</span>
                    <span className="h-3 rounded bg-gray-100 overflow-hidden" aria-hidden="true">
                      <span className="block h-full bg-primary rounded" style={{ width: `${(d.n / max) * 100}%` }} />
                    </span>
                    <span className="text-right font-semibold">{d.n}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="font-semibold text-text-primary">Where members are in signup</h2>
              <table className="w-full mt-3 text-sm">
                <tbody>
                  {Object.entries(data.byStatus)
                    .sort((a, b) => b[1] - a[1])
                    .map(([k, n]) => (
                      <tr key={k} className="border-b border-gray-100 last:border-0">
                        <td className="py-2 text-text-primary">{STATUS_LABEL[k] ?? k}</td>
                        <td className="py-2 text-right font-semibold">{n.toLocaleString("en-NG")}</td>
                        <td className="py-2 text-right text-text-secondary w-14">{Math.round((n / data.members) * 100)}%</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
