"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { downloadCsv, toCsv } from "@/lib/csv";

interface Sub { id: string; full_name: string | null; email: string | null; phone_number: string | null; state: string | null; is_home_service_provider: boolean; subscription_expires_at: string | null; artisan_expires_at: string | null }
type Window = "expired" | "7" | "30";
const DAY = 86_400_000;

function wa(phone: string | null, name: string | null, when: string) {
  const d = (phone ?? "").replace(/\D/g, "");
  const intl = d.startsWith("234") ? d : d.startsWith("0") ? `234${d.slice(1)}` : d;
  if (intl.length < 13) return null;
  const text = `Hello ${name?.split(" ")[0] ?? ""}, this is Skilled9ja. Your plan ${when}. Renew in the app so clients can keep finding you: https://skilled9ja.com/upgrade`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

export default function RenewalsPage() {
  const [rows, setRows] = useState<Sub[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [win, setWin] = useState<Window>("7");

  useEffect(() => {
    createClient()
      .from("profiles")
      .select("id, full_name, email, phone_number, state, is_home_service_provider, subscription_expires_at, artisan_expires_at")
      .eq("is_mock", false)
      .or("subscription_expires_at.not.is.null,artisan_expires_at.not.is.null")
      .limit(20000)
      .then(({ data, error: err }) => {
        if (err) setError("Couldn't load plans. Check you're signed in as an admin.");
        setRows((data ?? []) as Sub[]);
      });
  }, []);

  const list = useMemo(() => {
    const now = Date.now();
    return (rows ?? [])
      .map((r) => {
        const end = r.subscription_expires_at ?? r.artisan_expires_at!;
        return { ...r, end, days: Math.ceil((new Date(end).getTime() - now) / DAY), plan: r.subscription_expires_at ? "Home service" : "Artisan monthly" };
      })
      .filter((r) => (win === "expired" ? r.days < 0 && r.days >= -60 : r.days >= 0 && r.days <= Number(win)))
      .sort((a, b) => (win === "expired" ? b.days - a.days : a.days - b.days));
  }, [rows, win]);

  const label = (d: number) => (d < 0 ? `ended ${-d} day${d === -1 ? "" : "s"} ago` : d === 0 ? "ends today" : `ends in ${d} day${d === 1 ? "" : "s"}`);

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Renewals</h1>
          <p className="text-sm text-text-secondary mt-1">Monthly plans about to run out, or that ran out in the last 60 days. A friendly WhatsApp before the end date keeps most members paying.</p>
        </div>
        <button type="button" disabled={!list.length} onClick={() => downloadCsv(`skilled9ja-renewals-${win}.csv`, toCsv(list.map((r) => ({ ...r, when: label(r.days) })), [{ key: "full_name", label: "Name" }, { key: "phone_number", label: "Phone" }, { key: "email", label: "Email" }, { key: "plan", label: "Plan" }, { key: "when", label: "When" }, { key: "state", label: "State" }]))} className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold disabled:opacity-50">Export CSV</button>
      </div>
      <div role="tablist" aria-label="When" className="mt-4 inline-flex rounded-lg border border-gray-200 bg-white p-1">
        {([["7", "Next 7 days"], ["30", "Next 30 days"], ["expired", "Already ended"]] as [Window, string][]).map(([v, l]) => (
          <button key={v} role="tab" type="button" aria-selected={win === v} onClick={() => setWin(v)} className={`px-3 py-1.5 rounded-md text-sm font-semibold ${win === v ? "bg-primary text-white" : "text-text-secondary"}`}>{l}</button>
        ))}
      </div>
      {error && <p className="mt-4 text-sm font-semibold text-red-700" role="alert">{error}</p>}
      <ul className="mt-4 bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {rows === null ? (
          <li className="p-4 text-sm text-text-secondary">Loading…</li>
        ) : list.length === 0 ? (
          <li className="p-6 text-sm text-center text-text-secondary">Nobody in this window.</li>
        ) : (
          list.map((r) => {
            const link = wa(r.phone_number, r.full_name, label(r.days));
            return (
              <li key={r.id} className="p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[180px]">
                  <p className="font-semibold">{r.full_name || "No name"}</p>
                  <p className="text-xs text-text-secondary">{r.plan} · <span className={r.days < 3 ? "text-red-700 font-semibold" : ""}>{label(r.days)}</span>{r.state ? ` · ${r.state}` : ""}</p>
                </div>
                {link && <a href={link} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-semibold">WhatsApp</a>}
                {r.email && <a href={`mailto:${r.email}?subject=${encodeURIComponent("Your Skilled9ja plan")}`} className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold">Email</a>}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
