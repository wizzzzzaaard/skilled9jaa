"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { callAdmin } from "@/lib/admin";
import { downloadCsv, toCsv } from "@/lib/csv";
import { transferReference, naira } from "@/lib/payments";
import { NIGERIAN_STATES } from "@/lib/nigeria";

interface Member {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  state: string | null;
  city: string | null;
  account_status: string;
  payment_status: string | null;
  active_mode: string | null;
  is_artisan: boolean;
  is_company: boolean;
  is_home_service_provider: boolean;
  is_client: boolean;
  is_admin: boolean;
  is_mock: boolean;
  company_name: string | null;
  signup_step: number | null;
  created_at: string;
  signup_niche?: string | null;
  utm_source?: string | null;
}

interface Filters {
  q: string;
  role: string;
  status: string;
  paid: string;
  state: string;
  joined: string;
  source: string;
  mocks: boolean;
}
const EMPTY: Filters = { q: "", role: "", status: "", paid: "", state: "", joined: "", source: "", mocks: false };
const PAGE = 25;
const STUCK = ["incomplete", "pending_payment", "pending_manual"];
const BASE_COLS =
  "id, full_name, email, phone_number, state, city, account_status, payment_status, active_mode, is_artisan, is_company, is_home_service_provider, is_client, is_admin, is_mock, company_name, signup_step, created_at";

const STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-green-100 text-green-900" },
  incomplete: { label: "Unfinished signup", cls: "bg-gray-100 text-gray-800" },
  pending_payment: { label: "Stuck at payment", cls: "bg-amber-100 text-amber-900" },
  pending_manual: { label: "Transfer check", cls: "bg-amber-100 text-amber-900" },
  pending_verify: { label: "ID check", cls: "bg-blue-100 text-blue-900" },
  suspended: { label: "Suspended", cls: "bg-red-100 text-red-900" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-900" },
};

const roleOf = (m: Member) =>
  m.is_company ? "Company" : m.is_home_service_provider ? "Home service" : m.is_artisan ? "Artisan / job seeker" : "Client";

const waLink = (phone: string | null) => {
  const d = (phone ?? "").replace(/\D/g, "");
  const intl = d.startsWith("234") ? d : d.startsWith("0") ? `234${d.slice(1)}` : d;
  return intl.length >= 13 ? `https://wa.me/${intl}` : null;
};

/** Builds the members query for the current filters. */
// The query builder's generic type changes with every call, so it's kept loose here.
type Q = ReturnType<ReturnType<ReturnType<typeof createClient>["from"]>["select"]>;
function applyFilters(q: Q, f: Filters): Q {
  if (!f.mocks) q = q.eq("is_mock", false);
  const term = f.q.trim();
  const ref = term.toUpperCase().match(/^S9-([0-9A-F]{8})$/);
  if (ref) {
    const h = ref[1].toLowerCase();
    q = q.gte("id", `${h}-0000-0000-0000-000000000000`).lte("id", `${h}-ffff-ffff-ffff-ffffffffffff`);
  } else if (term) {
    const t = term.replace(/[%,()]/g, " ");
    q = q.or(`full_name.ilike.%${t}%,email.ilike.%${t}%,phone_number.ilike.%${t}%,company_name.ilike.%${t}%`);
  }
  if (f.role === "artisan") q = q.eq("is_artisan", true);
  if (f.role === "company") q = q.eq("is_company", true);
  if (f.role === "home_service") q = q.eq("is_home_service_provider", true);
  if (f.role === "client") q = q.eq("is_artisan", false).eq("is_company", false).eq("is_home_service_provider", false);
  if (f.status === "stuck") q = q.in("account_status", STUCK);
  else if (f.status) q = q.eq("account_status", f.status);
  if (f.paid === "paid") q = q.eq("payment_status", "verified");
  if (f.paid === "unpaid") q = q.neq("payment_status", "verified");
  if (f.state) q = q.eq("state", f.state);
  if (f.source) q = q.eq("signup_niche", f.source);
  if (f.joined) q = q.gte("created_at", new Date(Date.now() - Number(f.joined) * 86_400_000).toISOString());
  return q;
}

/** True on screens 768px and wider. Phones get cards instead of the wide table. */
function useWide() {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
}

export default function AdminMembersPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [draftQ, setDraftQ] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Member[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [hasSource, setHasSource] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<Member | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const wide = useWide();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const run = (cols: string) =>
      applyFilters(supabase.from("profiles").select(cols, { count: "exact" }), hasSource ? filters : { ...filters, source: "" })
        .order("created_at", { ascending: false })
        .range(page * PAGE, page * PAGE + PAGE - 1);
    let res = await run(hasSource ? `${BASE_COLS}, signup_niche, utm_source` : BASE_COLS);
    // Before the attribution migration these columns don't exist yet.
    if (res.error && hasSource && /signup_niche|utm_source/.test(res.error.message ?? "")) {
      setHasSource(false);
      res = await run(BASE_COLS);
    }
    if (res.error) setError("Couldn't load members. Check you're signed in as an admin.");
    else {
      setRows((res.data ?? []) as Member[]);
      setCount(res.count ?? null);
    }
    setLoading(false);
  }, [filters, page, hasSource]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setFilters((f) => (f.q === draftQ ? f : { ...f, q: draftQ }));
      setPage(0);
    }, 350);
    return () => window.clearTimeout(t);
  }, [draftQ]);

  const set = (patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(0);
    setSelected(new Set());
  };
  const pages = count ? Math.ceil(count / PAGE) : 1;
  const activeFilters = [filters.role, filters.status, filters.paid, filters.state, filters.joined, filters.source].filter(Boolean).length;
  const stuckSelected = useMemo(() => rows.filter((r) => selected.has(r.id) && STUCK.includes(r.account_status)).map((r) => r.id), [rows, selected]);

  async function exportCsv() {
    setBusy(true);
    const supabase = createClient();
    const all: Member[] = [];
    for (let from = 0; from < 20000; from += 1000) {
      const { data, error: err } = await applyFilters(supabase.from("profiles").select(hasSource ? `${BASE_COLS}, signup_niche, utm_source` : BASE_COLS), hasSource ? filters : { ...filters, source: "" })
        .order("created_at", { ascending: false })
        .range(from, from + 999);
      if (err || !data?.length) break;
      all.push(...(data as Member[]));
      if (data.length < 1000) break;
    }
    const csv = toCsv(
      all.map((m) => ({ ...m, role: roleOf(m), reference: transferReference(m.id), status: STATUS[m.account_status]?.label ?? m.account_status, paid: m.payment_status === "verified" ? "Yes" : "No", joined: m.created_at.slice(0, 10) })),
      [
        { key: "full_name", label: "Name" },
        { key: "company_name", label: "Company" },
        { key: "email", label: "Email" },
        { key: "phone_number", label: "Phone" },
        { key: "role", label: "Type" },
        { key: "status", label: "Status" },
        { key: "paid", label: "Paid" },
        { key: "state", label: "State" },
        { key: "city", label: "City" },
        { key: "signup_niche", label: "Signed up from" },
        { key: "utm_source", label: "Channel" },
        { key: "reference", label: "Transfer reference" },
        { key: "joined", label: "Joined" },
      ],
    );
    downloadCsv(`skilled9ja-members-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    setBusy(false);
    setNotice(`Exported ${all.length.toLocaleString("en-NG")} members.`);
  }

  async function letIn(ids: string[]) {
    setBusy(true);
    const res = await callAdmin<{ updated: number }>("let_in", { user_ids: ids });
    setBusy(false);
    if (!res.ok) return setNotice(res.error);
    setNotice(`Let ${res.data.updated} member${res.data.updated === 1 ? "" : "s"} in.`);
    setSelected(new Set());
    load();
  }

  const selectCls = "rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Members</h1>
          <p className="text-sm text-text-secondary mt-1" aria-live="polite">
            {count === null ? "Loading…" : `${count.toLocaleString("en-NG")} match`}
          </p>
        </div>
        <button type="button" onClick={exportCsv} disabled={busy || !count} className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold disabled:opacity-50">
          Export CSV
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label htmlFor="m-q" className="sr-only">Search members</label>
          <input id="m-q" value={draftQ} onChange={(e) => setDraftQ(e.target.value)} placeholder="Name, email, phone, company or S9- reference" className={`${selectCls} w-full`} />
        </div>
        <button type="button" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters} aria-controls="m-filters" className="md:hidden px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-left">
          Filters{activeFilters ? ` (${activeFilters} on)` : ""}
        </button>
        <div id="m-filters" className={`${showFilters ? "grid" : "hidden"} gap-2 sm:col-span-2 md:contents`}>
        <select aria-label="Type" className={selectCls} value={filters.role} onChange={(e) => set({ role: e.target.value })}>
          <option value="">All types</option>
          <option value="artisan">Artisans / job seekers</option>
          <option value="home_service">Home service</option>
          <option value="company">Companies</option>
          <option value="client">Clients</option>
        </select>
        <select aria-label="Status" className={selectCls} value={filters.status} onChange={(e) => set({ status: e.target.value })}>
          <option value="">All statuses</option>
          <option value="stuck">Stuck (unfinished, payment, transfer)</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select aria-label="Paid" className={selectCls} value={filters.paid} onChange={(e) => set({ paid: e.target.value })}>
          <option value="">Paid and free</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Free</option>
        </select>
        <select aria-label="State" className={selectCls} value={filters.state} onChange={(e) => set({ state: e.target.value })}>
          <option value="">All states</option>
          {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select aria-label="Joined" className={selectCls} value={filters.joined} onChange={(e) => set({ joined: e.target.value })}>
          <option value="">Joined any time</option>
          <option value="1">Last 24 hours</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
        {hasSource ? (
          <input aria-label="Signed up from page" className={selectCls} value={filters.source} onChange={(e) => set({ source: e.target.value.trim() })} placeholder="Signed up from (e.g. plumbers)" />
        ) : (
          <p className="text-xs text-text-secondary self-center">Signup source appears after the attribution update.</p>
        )}
        </div>
      </div>
      <label className="mt-2 inline-flex items-center gap-2 text-sm text-text-secondary">
        <input type="checkbox" checked={filters.mocks} onChange={(e) => set({ mocks: e.target.checked })} className="w-4 h-4 accent-[#1B4332]" /> Include mock profiles
      </label>

      {notice && (
        <p className="mt-3 text-sm font-semibold bg-white border border-gray-200 rounded-lg px-3 py-2" role="status">
          {notice}
        </p>
      )}

      {selected.size > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
          <span className="text-sm font-semibold">{selected.size} selected</span>
          <button type="button" disabled={busy || !stuckSelected.length} onClick={() => letIn(stuckSelected)} className="px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50">
            Let in {stuckSelected.length || ""} stuck
          </button>
          <button type="button" onClick={() => setSelected(new Set())} className="text-sm font-semibold underline">Clear</button>
        </div>
      )}

      {error && <p className="mt-4 text-sm font-semibold text-red-700" role="alert">{error}</p>}

      {!wide ? (
        <ul className={`mt-4 space-y-2 transition-opacity ${loading && rows.length ? "opacity-60" : ""}`} aria-busy={loading}>
          {loading && rows.length === 0 ? (
            <li className="p-6 text-center text-sm text-text-secondary">Loading…</li>
          ) : rows.length === 0 ? (
            <li className="p-6 text-center text-sm text-text-secondary">No members match these filters.</li>
          ) : (
            rows.map((m) => (
              <li key={m.id} className="flex gap-3 items-start bg-white rounded-xl border border-gray-100 p-3">
                <input
                  type="checkbox"
                  aria-label={`Select ${m.full_name || m.email}`}
                  className="mt-1 w-5 h-5 accent-[#1B4332]"
                  checked={selected.has(m.id)}
                  onChange={(e) => setSelected((s) => { const n = new Set(s); e.target.checked ? n.add(m.id) : n.delete(m.id); return n; })}
                />
                <button type="button" onClick={() => setOpen(m)} className="flex-1 min-w-0 text-left">
                  <span className="block font-semibold text-text-primary truncate">{m.full_name || "No name"}{m.is_admin ? " (admin)" : ""}</span>
                  <span className="block text-xs text-text-secondary truncate">{m.company_name || m.email}</span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-text-secondary">
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${STATUS[m.account_status]?.cls ?? "bg-gray-100"}`}>{STATUS[m.account_status]?.label ?? m.account_status}</span>
                    {m.payment_status === "verified" && <span className="px-2 py-0.5 rounded-full font-semibold bg-[#F4B400]/25 text-[#5c4300]">Paid</span>}
                    <span>{roleOf(m)}</span>
                    {m.state && <span>· {m.state}</span>}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : (
      <div className={`mt-4 bg-white rounded-xl border border-gray-100 overflow-x-auto transition-opacity ${loading && rows.length ? "opacity-60" : ""}`} aria-busy={loading}>
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-100 text-left text-xs text-text-secondary">
            <tr>
              <th className="px-3 py-3 w-10">
                <input
                  type="checkbox"
                  aria-label="Select all on this page"
                  className="w-4 h-4 accent-[#1B4332]"
                  checked={rows.length > 0 && rows.every((r) => selected.has(r.id))}
                  onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())}
                />
              </th>
              <th className="px-3 py-3 font-semibold">Member</th>
              <th className="px-3 py-3 font-semibold">Type</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-3 py-3 font-semibold">Paid</th>
              <th className="px-3 py-3 font-semibold">Location</th>
              {hasSource && <th className="px-3 py-3 font-semibold">From</th>}
              <th className="px-3 py-3 font-semibold">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && rows.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-text-secondary">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-text-secondary">No members match these filters.</td></tr>
            ) : (
              rows.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${m.full_name || m.email}`}
                      className="w-4 h-4 accent-[#1B4332]"
                      checked={selected.has(m.id)}
                      onChange={(e) => setSelected((s) => { const n = new Set(s); e.target.checked ? n.add(m.id) : n.delete(m.id); return n; })}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <button type="button" onClick={() => setOpen(m)} className="text-left">
                      <span className="block font-semibold text-text-primary underline-offset-2 hover:underline">
                        {m.full_name || "No name"} {m.is_admin && <span className="text-xs font-semibold text-primary">(admin)</span>} {m.is_mock && <span className="text-xs text-text-secondary">(mock)</span>}
                      </span>
                      <span className="block text-xs text-text-secondary">{m.company_name || m.email}</span>
                    </button>
                  </td>
                  <td className="px-3 py-3 text-text-secondary">{roleOf(m)}</td>
                  <td className="px-3 py-3"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS[m.account_status]?.cls ?? "bg-gray-100"}`}>{STATUS[m.account_status]?.label ?? m.account_status}</span></td>
                  <td className="px-3 py-3">{m.payment_status === "verified" ? "Yes" : "–"}</td>
                  <td className="px-3 py-3 text-text-secondary">{[m.city, m.state].filter(Boolean).join(", ") || "–"}</td>
                  {hasSource && <td className="px-3 py-3 text-text-secondary">{m.signup_niche ? `/${m.signup_niche}${m.utm_source ? ` · ${m.utm_source}` : ""}` : "–"}</td>}
                  <td className="px-3 py-3 text-text-secondary whitespace-nowrap">{new Date(m.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "2-digit" })}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}

      {count !== null && count > PAGE && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="px-3 py-2 rounded-lg border border-gray-200 bg-white font-semibold disabled:opacity-40">Previous</button>
          <span className="text-text-secondary">Page {page + 1} of {pages}</span>
          <button type="button" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-2 rounded-lg border border-gray-200 bg-white font-semibold disabled:opacity-40">Next</button>
        </div>
      )}

      {open && <MemberPanel member={open} onClose={() => setOpen(null)} onChanged={() => { load(); }} />}
    </div>
  );
}

function MemberPanel({ member, onClose, onChanged }: { member: Member; onClose: () => void; onChanged: () => void }) {
  const [m, setM] = useState(member);
  const [payments, setPayments] = useState<{ kind: string; amount: number; status: string; created_at: string }[] | null>(null);
  const [confirm, setConfirm] = useState<null | "suspend" | "reactivate" | "paid" | "letin">(null);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("user_payments").select("amount, status, created_at").eq("user_id", member.id).order("created_at", { ascending: false }),
      supabase.from("orders").select("amount, status, created_at, order_type").eq("user_id", member.id).order("created_at", { ascending: false }),
    ]).then(([t, o]) => {
      const tx = ((t.data ?? []) as { amount: number; status: string; created_at: string }[]).map((x) => ({ kind: "Bank transfer", ...x }));
      const cards = ((o.data ?? []) as { amount: number; status: string; created_at: string }[]).map((x) => ({ kind: "Card (Paystack)", ...x }));
      setPayments([...tx, ...cards].sort((a, b) => b.created_at.localeCompare(a.created_at)));
    });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [member.id, onClose]);

  async function run() {
    if (!confirm) return;
    setBusy(true);
    const res =
      confirm === "paid"
        ? await callAdmin("mark_paid", { user_id: m.id, reason })
        : confirm === "letin"
        ? await callAdmin("let_in", { user_ids: [m.id], reason })
        : await callAdmin("set_user_status", { user_id: m.id, status: confirm === "suspend" ? "suspended" : "active", reason });
    setBusy(false);
    if (!res.ok) return setMsg(res.error);
    const next = { ...m };
    if (confirm === "paid") next.payment_status = "verified";
    else next.account_status = confirm === "suspend" ? "suspended" : "active";
    setM(next);
    setMsg("Done. The change is in the audit log.");
    setConfirm(null);
    setReason("");
    onChanged();
  }

  const wa = waLink(m.phone_number);
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-3 py-2 border-b border-gray-100 text-sm">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="text-right font-semibold text-text-primary break-all">{value || "–"}</dd>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="member-title">
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white overflow-y-auto p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="member-title" className="text-xl font-semibold text-text-primary">{m.full_name || "No name"}</h2>
            <p className="text-sm text-text-secondary">{roleOf(m)}{m.company_name ? `, ${m.company_name}` : ""}</p>
          </div>
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold">Close</button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {m.email && <a href={`mailto:${m.email}`} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold">Email</a>}
          {m.phone_number && <a href={`tel:${m.phone_number}`} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold">Call</a>}
          {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold">WhatsApp</a>}
        </div>

        <dl className="mt-4">
          {row("Status", STATUS[m.account_status]?.label ?? m.account_status)}
          {row("Paid", m.payment_status === "verified" ? "Yes" : "No")}
          {row("Email", m.email)}
          {row("Phone", m.phone_number)}
          {row("Location", [m.city, m.state].filter(Boolean).join(", "))}
          {row("Signed up from", m.signup_niche ? `/${m.signup_niche}${m.utm_source ? ` via ${m.utm_source}` : ""}` : null)}
          {row("Signup step", m.signup_step)}
          {row("Transfer reference", <span className="font-mono">{transferReference(m.id)}</span>)}
          {row("Joined", new Date(m.created_at).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }))}
        </dl>

        <h3 className="mt-5 font-semibold text-text-primary">Payments</h3>
        {payments === null ? (
          <p className="text-sm text-text-secondary mt-1">Loading…</p>
        ) : payments.length === 0 ? (
          <p className="text-sm text-text-secondary mt-1">No payments.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {payments.map((p, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>{p.kind}, {new Date(p.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</span>
                <span className="font-semibold">{naira(Number(p.amount))} <span className="font-normal text-text-secondary">{p.status}</span></span>
              </li>
            ))}
          </ul>
        )}

        <h3 className="mt-5 font-semibold text-text-primary">Actions</h3>
        {msg && <p className="mt-2 text-sm font-semibold" role="status">{msg}</p>}
        {!confirm ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {STUCK.includes(m.account_status) && <button type="button" onClick={() => setConfirm("letin")} className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-semibold">Let in</button>}
            {m.payment_status !== "verified" && <button type="button" onClick={() => setConfirm("paid")} className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold">Mark as paid</button>}
            {m.account_status === "suspended" ? (
              <button type="button" onClick={() => setConfirm("reactivate")} className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold">Reactivate</button>
            ) : (
              !m.is_admin && <button type="button" onClick={() => setConfirm("suspend")} className="px-3 py-2 rounded-lg border border-red-200 text-red-800 text-sm font-semibold">Suspend</button>
            )}
          </div>
        ) : (
          <div className="mt-2 p-3 rounded-lg border border-gray-200 bg-gray-50">
            <p className="text-sm font-semibold">
              {confirm === "suspend" ? "Suspend this member? They won't be able to use the app." : confirm === "reactivate" ? "Reactivate this member?" : confirm === "paid" ? "Mark as paid? Do this only after you've seen the money arrive." : "Let this member into the app?"}
            </p>
            <label htmlFor="act-reason" className="block text-sm mt-2">Reason (saved in the audit log)</label>
            <input id="act-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={run} disabled={busy || (confirm === "suspend" && reason.trim().length < 3)} className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50">{busy ? "Saving…" : "Confirm"}</button>
              <button type="button" onClick={() => setConfirm(null)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold">Cancel</button>
            </div>
            {confirm === "suspend" && reason.trim().length < 3 && <p className="text-xs text-text-secondary mt-1">A reason is required to suspend.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
