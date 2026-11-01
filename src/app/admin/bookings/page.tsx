"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { naira } from "@/lib/payments";
import { downloadCsv, toCsv } from "@/lib/csv";

interface Booking {
  id: string; client_id: string; provider_id: string; status: string; booking_type: string | null; description: string | null;
  scheduled_at: string | null; event_city: string | null; event_state: string | null;
  service_amount: number | null; transport_fee: number | null; platform_fee: number | null; total_amount: number | null;
  paid_at: string | null; is_escrow_released: boolean | null; dispute_reason: string | null; disputed_at: string | null;
  cancellation_reason: string | null; client_rating: number | null; created_at: string;
}
interface Person { id: string; full_name: string | null; phone_number: string | null; email: string | null }

const STATUSES: Record<string, { label: string; cls: string }> = {
  pending: { label: "Waiting for provider", cls: "bg-amber-100 text-amber-900" },
  confirmed: { label: "Confirmed", cls: "bg-blue-100 text-blue-900" },
  started: { label: "In progress", cls: "bg-blue-100 text-blue-900" },
  completed: { label: "Completed", cls: "bg-green-100 text-green-900" },
  cancelled: { label: "Cancelled", cls: "bg-gray-100 text-gray-800" },
  disputed: { label: "Disputed", cls: "bg-red-100 text-red-900" },
  refunded: { label: "Refunded", cls: "bg-gray-100 text-gray-800" },
};
const wa = (phone: string | null) => {
  const d = (phone ?? "").replace(/\D/g, "");
  const intl = d.startsWith("234") ? d : d.startsWith("0") ? `234${d.slice(1)}` : d;
  return intl.length >= 13 ? `https://wa.me/${intl}` : null;
};

export default function AdminBookingsPage() {
  const [rows, setRows] = useState<Booking[] | null>(null);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data, error: err } = await supabase.from("bookings").select("*").order("created_at", { ascending: false }).limit(500);
      if (err) { setError("Couldn't load bookings."); setRows([]); return; }
      const list = (data ?? []) as Booking[];
      const ids = Array.from(new Set(list.flatMap((b) => [b.client_id, b.provider_id]).filter(Boolean)));
      if (ids.length) {
        const { data: ps } = await supabase.from("profiles").select("id, full_name, phone_number, email").in("id", ids);
        setPeople(Object.fromEntries(((ps ?? []) as Person[]).map((p) => [p.id, p])));
      }
      setRows(list);
    })();
  }, []);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (rows ?? []).filter((b) => (!status || b.status === status) && (!t || b.id.startsWith(t) || [people[b.client_id]?.full_name, people[b.provider_id]?.full_name].some((n) => n?.toLowerCase().includes(t))));
  }, [rows, status, q, people]);
  const disputes = (rows ?? []).filter((b) => b.status === "disputed").length;
  const gmv = (rows ?? []).filter((b) => b.paid_at).reduce((s, b) => s + Number(b.total_amount ?? 0), 0);
  const fees = (rows ?? []).filter((b) => b.status === "completed").reduce((s, b) => s + Number(b.platform_fee ?? 0), 0);

  function exportCsv() {
    downloadCsv(`skilled9ja-bookings-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(
      shown.map((b) => ({ ...b, client: people[b.client_id]?.full_name ?? "", provider: people[b.provider_id]?.full_name ?? "", status_label: STATUSES[b.status]?.label ?? b.status, created: b.created_at.slice(0, 10) })),
      [{ key: "id", label: "Booking" }, { key: "created", label: "Created" }, { key: "client", label: "Client" }, { key: "provider", label: "Provider" }, { key: "status_label", label: "Status" }, { key: "service_amount", label: "Service (₦)" }, { key: "transport_fee", label: "Transport (₦)" }, { key: "platform_fee", label: "Platform fee (₦)" }, { key: "total_amount", label: "Total (₦)" }],
    ));
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Bookings</h1>
          <p className="text-sm text-text-secondary mt-1">Home-service bookings, newest first (last 500).</p>
        </div>
        <button type="button" onClick={exportCsv} disabled={!shown.length} className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold disabled:opacity-50">Export CSV</button>
      </div>

      <dl className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[["Bookings", String(rows?.length ?? "–")], ["Paid by clients", naira(gmv)], ["Platform fees earned", naira(fees)], ["Open disputes", String(disputes)]].map(([k, v]) => (
          <div key={k} className={`bg-white rounded-xl border p-4 ${k === "Open disputes" && disputes ? "border-red-300" : "border-gray-100"}`}>
            <dt className="text-sm text-text-secondary">{k}</dt>
            <dd className="text-xl font-semibold mt-1">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <label htmlFor="bk-q" className="sr-only">Search bookings</label>
        <input id="bk-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Client or provider name, or booking ID" className="flex-1 min-w-[220px] rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white" />
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white">
          <option value="">All statuses</option>
          {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      {error && <p className="mt-4 text-sm font-semibold text-red-700" role="alert">{error}</p>}

      <ul className="mt-4 space-y-2">
        {rows === null ? <li className="text-sm text-text-secondary">Loading…</li> : shown.length === 0 ? <li className="text-sm text-text-secondary bg-white rounded-xl border border-gray-100 p-6 text-center">No bookings{status || q ? " match" : " yet"}.</li> : shown.map((b) => {
          const c = people[b.client_id];
          const p = people[b.provider_id];
          const isOpen = open === b.id;
          return (
            <li key={b.id} className={`bg-white rounded-xl border p-4 ${b.status === "disputed" ? "border-red-300" : "border-gray-100"}`}>
              <button type="button" onClick={() => setOpen(isOpen ? null : b.id)} aria-expanded={isOpen} className="w-full text-left flex flex-wrap items-center gap-3">
                <span className="flex-1 min-w-[200px]">
                  <span className="block font-semibold">{c?.full_name ?? "Client"} → {p?.full_name ?? "Provider"}</span>
                  <span className="block text-xs text-text-secondary">{b.scheduled_at ? new Date(b.scheduled_at).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "No date"}{b.event_city ? ` · ${b.event_city}` : ""} · #{b.id.slice(0, 8)}</span>
                </span>
                <span className="font-semibold">{naira(Number(b.total_amount ?? 0))}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUSES[b.status]?.cls ?? "bg-gray-100"}`}>{STATUSES[b.status]?.label ?? b.status}</span>
              </button>
              {isOpen && (
                <div className="mt-3 pt-3 border-t border-gray-100 grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    {b.description && <p className="break-words">{b.description}</p>}
                    <p className="mt-2 text-text-secondary">Service {naira(Number(b.service_amount ?? 0))} + transport {naira(Number(b.transport_fee ?? 0))} + fee {naira(Number(b.platform_fee ?? 0))}</p>
                    <p className="text-text-secondary">{b.paid_at ? `Paid ${new Date(b.paid_at).toLocaleDateString("en-NG")}` : "Not paid"} · {b.is_escrow_released ? "Released to provider" : "Held in escrow"}</p>
                    {b.dispute_reason && <p className="mt-2 text-red-800 font-semibold">Dispute: {b.dispute_reason}</p>}
                    {b.cancellation_reason && <p className="mt-2 text-text-secondary">Cancelled: {b.cancellation_reason}</p>}
                  </div>
                  <div className="space-y-2">
                    {[["Client", c], ["Provider", p]].map(([label, who]) => {
                      const person = who as Person | undefined;
                      const link = wa(person?.phone_number ?? null);
                      return (
                        <div key={label as string}>
                          <p className="font-semibold">{label as string}: {person?.full_name ?? "Unknown"}</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {link && <a href={link} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 rounded-md border border-gray-200 text-xs font-semibold">WhatsApp</a>}
                            {person?.phone_number && <a href={`tel:${person.phone_number}`} className="px-2.5 py-1 rounded-md border border-gray-200 text-xs font-semibold">Call</a>}
                            {person?.email && <a href={`mailto:${person.email}`} className="px-2.5 py-1 rounded-md border border-gray-200 text-xs font-semibold">Email</a>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
