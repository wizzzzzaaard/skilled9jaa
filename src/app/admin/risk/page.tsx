"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { normalizeNgPhone } from "@/lib/utils/phone";

interface P { id: string; full_name: string | null; email: string | null; phone_number: string | null; nin_number?: string | null; account_status: string; created_at: string; signup_niche?: string | null; company_name: string | null }
interface Flag { kind: string; title: string; detail: string; members: P[]; search?: string; severity: "high" | "medium" }

const DAY = 86_400_000;

export default function RiskPage() {
  const [flags, setFlags] = useState<Flag[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanned, setScanned] = useState(0);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const base = "id, full_name, email, phone_number, account_status, created_at, company_name";
      type Res = { data: unknown[] | null; error: { message?: string } | null };
      let res = (await supabase.from("profiles").select(`${base}, nin_number, signup_niche`).eq("is_mock", false).limit(50000)) as unknown as Res;
      if (res.error && /signup_niche|nin_number/.test(res.error.message ?? "")) {
        res = (await supabase.from("profiles").select(`${base}, nin_number`).eq("is_mock", false).limit(50000)) as unknown as Res;
      }
      if (res.error) return setError("Couldn't load members. Check you're signed in as an admin.");
      const people = (res.data ?? []) as P[];
      setScanned(people.length);
      const out: Flag[] = [];

      // 1. One phone number on several accounts.
      const byPhone = new Map<string, P[]>();
      for (const p of people) {
        const n = p.phone_number ? normalizeNgPhone(p.phone_number) : null;
        if (n) byPhone.set(n, [...(byPhone.get(n) ?? []), p]);
      }
      byPhone.forEach((list, phone) => {
        if (list.length > 1) out.push({ kind: "phone", severity: list.length > 2 ? "high" : "medium", title: `${list.length} accounts share ${phone}`, detail: "Could be one person with several accounts, or a family phone.", members: list, search: phone.slice(-10) });
      });

      // 2. One NIN on several accounts.
      const byNin = new Map<string, P[]>();
      for (const p of people) if (p.nin_number && p.nin_number.trim().length >= 6) byNin.set(p.nin_number.trim(), [...(byNin.get(p.nin_number.trim()) ?? []), p]);
      byNin.forEach((list) => {
        if (list.length > 1) out.push({ kind: "nin", severity: "high", title: `${list.length} accounts use the same NIN`, detail: "Each person has one NIN, so all but one of these are likely fake.", members: list });
      });

      // 3. Signup bursts: a day where one source brought far more signups than usual.
      const now = Date.now();
      const recent = people.filter((p) => now - new Date(p.created_at).getTime() < 15 * DAY);
      const bySource = new Map<string, Map<string, P[]>>();
      for (const p of recent) {
        const src = p.signup_niche ? `/${p.signup_niche}` : "homepage / direct";
        const day = p.created_at.slice(0, 10);
        const m = bySource.get(src) ?? new Map<string, P[]>();
        m.set(day, [...(m.get(day) ?? []), p]);
        bySource.set(src, m);
      }
      bySource.forEach((days, src) => {
        const total = Array.from(days.values()).reduce((s, l) => s + l.length, 0);
        const avg = total / 14;
        days.forEach((list, day) => {
          if (list.length >= 10 && list.length >= 4 * avg) {
            const unfinished = list.filter((p) => p.account_status === "incomplete").length;
            out.push({ kind: "burst", severity: unfinished / list.length > 0.7 ? "high" : "medium", title: `${list.length} signups from ${src} on ${new Date(day).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}`, detail: `Usually about ${Math.max(1, Math.round(avg))} a day. ${unfinished} never finished signup. A successful campaign looks like this too; bots usually leave signups unfinished.`, members: list.slice(0, 20) });
          }
        });
      });

      // 4. Employers posting lots of jobs in a day (a common scam pattern).
      const { data: jobs } = await supabase.from("jobs").select("employer_id, created_at").gte("created_at", new Date(now - DAY).toISOString()).limit(5000);
      const perEmployer = new Map<string, number>();
      for (const j of (jobs ?? []) as { employer_id: string }[]) perEmployer.set(j.employer_id, (perEmployer.get(j.employer_id) ?? 0) + 1);
      perEmployer.forEach((n, id) => {
        const who = people.find((p) => p.id === id);
        if (n >= 5 && who) out.push({ kind: "jobs", severity: n >= 10 ? "high" : "medium", title: `${who.company_name || who.full_name} posted ${n} jobs in 24 hours`, detail: "Check the jobs aren't duplicates or fee scams.", members: [who] });
      });

      // 5. Several open reports about the same member.
      const { data: reps, error: repErr } = await supabase.from("content_reports").select("target_id").eq("status", "open").eq("target_type", "profile").limit(5000);
      if (!repErr) {
        const perTarget = new Map<string, number>();
        for (const r of (reps ?? []) as { target_id: string }[]) perTarget.set(r.target_id, (perTarget.get(r.target_id) ?? 0) + 1);
        perTarget.forEach((n, id) => {
          const who = people.find((p) => p.id === id);
          if (n >= 3 && who) out.push({ kind: "reports", severity: "high", title: `${n} open reports about ${who.company_name || who.full_name}`, detail: "See Reports & moderation.", members: [who] });
        });
      }

      out.sort((a, b) => (a.severity === b.severity ? b.members.length - a.members.length : a.severity === "high" ? -1 : 1));
      setFlags(out);
    })();
  }, []);

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-2xl font-semibold text-text-primary">Fraud warnings</h1>
      <p className="text-sm text-text-secondary mt-1">
        Patterns worth a look: shared phone numbers or NINs, sudden signup spikes, employers posting many jobs at once, and members with several reports. A warning isn&apos;t proof, so check before you suspend anyone.
      </p>
      {error && <p className="mt-4 text-sm font-semibold text-red-700" role="alert">{error}</p>}
      {flags === null && !error ? (
        <p className="mt-6 text-sm text-text-secondary">Checking members…</p>
      ) : flags && flags.length === 0 ? (
        <p className="mt-6 text-sm bg-white rounded-xl border border-gray-100 p-6 text-center text-text-secondary">No warnings across {scanned.toLocaleString("en-NG")} members.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {flags?.map((f, i) => (
            <li key={i} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold text-text-primary">{f.title}</h2>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold ${f.severity === "high" ? "bg-red-100 text-red-900" : "bg-amber-100 text-amber-900"}`}>{f.severity === "high" ? "Check soon" : "Worth a look"}</span>
              </div>
              <p className="text-sm text-text-secondary mt-1">{f.detail}</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {f.members.map((m) => (
                  <li key={m.id}>
                    <Link href={`/admin/users?q=${encodeURIComponent(m.email || m.full_name || "")}`} className="inline-block text-xs px-2 py-1 rounded-md border border-gray-200 hover:border-primary">
                      {m.company_name || m.full_name || m.email || "No name"}{m.account_status === "suspended" ? " (suspended)" : ""}
                    </Link>
                  </li>
                ))}
              </ul>
              {f.search && <Link href={`/admin/users?q=${encodeURIComponent(f.search)}`} className="mt-2 inline-block text-sm font-semibold underline">Open these in Members</Link>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
