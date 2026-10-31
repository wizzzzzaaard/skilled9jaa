"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { downloadCsv, toCsv } from "@/lib/csv";
import { naira } from "@/lib/payments";

type Pay = { amount: number; status: string; created_at: string; approved_at: string | null };
type Prof = { created_at: string; account_status: string; payment_status: string | null; signup_niche?: string | null; utm_source?: string | null };

interface Month { key: string; label: string; signups: number; paid: number; card: number; transfer: number }
interface Source { source: string; signups: number; active: number; paid: number }

const monthKey = (iso: string) => iso.slice(0, 7);

export default function AdminReportsPage() {
  const [range, setRange] = useState(6);
  const [profiles, setProfiles] = useState<Prof[] | null>(null);
  const [transfers, setTransfers] = useState<Pay[]>([]);
  const [orders, setOrders] = useState<Pay[]>([]);
  const [hasSource, setHasSource] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const base = "created_at, account_status, payment_status";
      type Res = { data: unknown[] | null; error: { message?: string } | null };
      let p = (await supabase.from("profiles").select(`${base}, signup_niche, utm_source`).eq("is_mock", false).limit(50000)) as unknown as Res;
      if (p.error && /signup_niche|utm_source/.test(p.error.message ?? "")) {
        setHasSource(false);
        p = (await supabase.from("profiles").select(base).eq("is_mock", false).limit(50000)) as unknown as Res;
      }
      if (p.error) return setError("Couldn't load the numbers. Check that you're signed in as an admin.");
      const [t, o] = await Promise.all([
        supabase.from("user_payments").select("amount, status, created_at, approved_at").eq("status", "approved").limit(50000),
        supabase.from("orders").select("amount, status, created_at, approved_at").eq("status", "verified").limit(50000),
      ]);
      setProfiles((p.data ?? []) as Prof[]);
      setTransfers((t.data ?? []) as Pay[]);
      setOrders((o.data ?? []) as Pay[]);
    })();
  }, []);

  const months = useMemo<Month[]>(() => {
    const now = new Date();
    const list: Month[] = Array.from({ length: range }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (range - 1 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return { key, label: d.toLocaleDateString("en-NG", { month: "short", year: "2-digit" }), signups: 0, paid: 0, card: 0, transfer: 0 };
    });
    const by = new Map(list.map((m) => [m.key, m]));
    for (const p of profiles ?? []) {
      const m = by.get(monthKey(p.created_at));
      if (m) {
        m.signups++;
        if (p.payment_status === "verified") m.paid++;
      }
    }
    for (const o of orders) { const m = by.get(monthKey(o.approved_at ?? o.created_at)); if (m) m.card += Number(o.amount || 0); }
    for (const t of transfers) { const m = by.get(monthKey(t.approved_at ?? t.created_at)); if (m) m.transfer += Number(t.amount || 0); }
    return list;
  }, [profiles, orders, transfers, range]);

  const sources = useMemo<Source[]>(() => {
    const map = new Map<string, Source>();
    for (const p of profiles ?? []) {
      const key = p.signup_niche ? `/${p.signup_niche}${p.utm_source ? ` · ${p.utm_source}` : ""}` : "Homepage / direct";
      const s = map.get(key) ?? { source: key, signups: 0, active: 0, paid: 0 };
      s.signups++;
      if (p.account_status === "active") s.active++;
      if (p.payment_status === "verified") s.paid++;
      map.set(key, s);
    }
    return Array.from(map.values()).sort((a, b) => b.signups - a.signups);
  }, [profiles]);

  const funnel = useMemo(() => {
    const all = profiles ?? [];
    return [
      { label: "Started signup", n: all.length },
      { label: "Finished signup", n: all.filter((p) => p.account_status !== "incomplete").length },
      { label: "Active in the app", n: all.filter((p) => p.account_status === "active").length },
      { label: "Paid", n: all.filter((p) => p.payment_status === "verified").length },
    ];
  }, [profiles]);

  const maxRev = Math.max(1, ...months.map((m) => m.card + m.transfer));
  const maxSign = Math.max(1, ...months.map((m) => m.signups));
  const totalRev = months.reduce((s, m) => s + m.card + m.transfer, 0);
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");

  function exportMonths() {
    downloadCsv(
      `skilled9ja-monthly-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(months.map((m) => ({ ...m, total: m.card + m.transfer })), [
        { key: "key", label: "Month" },
        { key: "signups", label: "Signups" },
        { key: "paid", label: "Paid members (joined that month)" },
        { key: "card", label: "Card revenue (₦)" },
        { key: "transfer", label: "Transfer revenue (₦)" },
        { key: "total", label: "Total revenue (₦)" },
      ]),
    );
  }
  function exportSources() {
    downloadCsv(
      `skilled9ja-sources-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(sources.map((s) => ({ ...s, rate: pct(s.paid, s.signups) })), [
        { key: "source", label: "Signed up from" },
        { key: "signups", label: "Signups" },
        { key: "active", label: "Active" },
        { key: "paid", label: "Paid" },
        { key: "rate", label: "Paid rate" },
      ]),
    );
  }

  if (error) return <p className="p-8 text-sm font-semibold text-red-700" role="alert">{error}</p>;
  if (!profiles) return <p className="p-8 text-text-secondary">Loading…</p>;

  const card = "bg-white rounded-xl border border-gray-100 p-5";
  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Reports</h1>
          <p className="text-sm text-text-secondary mt-1">Mock profiles are left out. Revenue counts verified card payments and approved transfers.</p>
        </div>
        <select aria-label="Period" value={range} onChange={(e) => setRange(Number(e.target.value))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white">
          <option value={3}>Last 3 months</option>
          <option value={6}>Last 6 months</option>
          <option value={12}>Last 12 months</option>
        </select>
      </div>

      <section className={card} aria-labelledby="rev-h">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="rev-h" className="font-semibold text-text-primary">Revenue and signups by month</h2>
          <button type="button" onClick={exportMonths} className="text-sm font-semibold underline">Export CSV</button>
        </div>
        <p className="text-sm text-text-secondary mt-1">{naira(totalRev)} in this period.</p>
        <table className="w-full mt-4 text-sm">
          <thead className="text-left text-xs text-text-secondary">
            <tr>
              <th className="py-2 font-semibold w-20">Month</th>
              <th className="py-2 font-semibold">Revenue</th>
              <th className="py-2 font-semibold">Signups</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.key} className="border-t border-gray-50">
                <th scope="row" className="py-2 font-semibold text-left">{m.label}</th>
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-3 rounded-sm overflow-hidden" style={{ width: `${((m.card + m.transfer) / maxRev) * 60}%`, minWidth: m.card + m.transfer ? 4 : 0 }} aria-hidden="true">
                      <span className="bg-[#1B4332]" style={{ flex: m.card }} />
                      <span className="bg-[#F4B400]" style={{ flex: m.transfer }} />
                    </div>
                    <span className="whitespace-nowrap">{naira(m.card + m.transfer)}</span>
                  </div>
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 rounded-sm bg-[#2d6e4c]" style={{ width: `${(m.signups / maxSign) * 50}%`, minWidth: m.signups ? 4 : 0 }} aria-hidden="true" />
                    <span>{m.signups.toLocaleString("en-NG")} <span className="text-text-secondary">({m.paid} paid)</span></span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 flex gap-4 text-xs text-text-secondary">
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#1B4332]" aria-hidden="true" /> Card</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#F4B400]" aria-hidden="true" /> Bank transfer</span>
        </p>
      </section>

      <section className={card} aria-labelledby="fun-h">
        <h2 id="fun-h" className="font-semibold text-text-primary">Signup funnel (all time)</h2>
        <ol className="mt-3 space-y-2">
          {funnel.map((f, i) => (
            <li key={f.label} className="text-sm">
              <div className="flex justify-between">
                <span>{f.label}</span>
                <span className="font-semibold">{f.n.toLocaleString("en-NG")} {i > 0 && <span className="font-normal text-text-secondary">({pct(f.n, funnel[0].n)})</span>}</span>
              </div>
              <div className="h-2 mt-1 rounded-full bg-gray-100" aria-hidden="true">
                <div className="h-2 rounded-full bg-[#1B4332]" style={{ width: pct(f.n, funnel[0].n) === "–" ? 0 : pct(f.n, funnel[0].n) }} />
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={card} aria-labelledby="src-h">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="src-h" className="font-semibold text-text-primary">Where members come from</h2>
          {hasSource && <button type="button" onClick={exportSources} className="text-sm font-semibold underline">Export CSV</button>}
        </div>
        {!hasSource ? (
          <p className="text-sm text-text-secondary mt-2">Landing-page tracking starts once the attribution database update is applied. Campaign links already carry the tags.</p>
        ) : (
          <div className="overflow-x-auto mt-3">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="text-left text-xs text-text-secondary">
                <tr>
                  <th className="py-2 font-semibold">Signed up from</th>
                  <th className="py-2 font-semibold text-right">Signups</th>
                  <th className="py-2 font-semibold text-right">Active</th>
                  <th className="py-2 font-semibold text-right">Paid</th>
                  <th className="py-2 font-semibold text-right">Paid rate</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.source} className="border-t border-gray-50">
                    <td className="py-2">{s.source}</td>
                    <td className="py-2 text-right">{s.signups}</td>
                    <td className="py-2 text-right">{s.active}</td>
                    <td className="py-2 text-right">{s.paid}</td>
                    <td className="py-2 text-right font-semibold">{pct(s.paid, s.signups)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
