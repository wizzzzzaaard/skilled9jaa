"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { callAdmin } from "@/lib/admin";

interface Req { id: number; created_at: string; user_id: string; kind: "export" | "delete"; status: string; completed_at: string | null; note: string | null }
interface Person { id: string; full_name: string | null; email: string | null; phone_number: string | null }
const DAY = 86_400_000;

export default function DataRequestsPage() {
  const [rows, setRows] = useState<Req[] | null>(null);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    const res = await callAdmin<{ data: Req[]; people: Person[]; missing?: boolean }>("list_data_requests");
    if (!res.ok) { setError(res.error); setRows([]); return; }
    setMissing(!!res.data.missing);
    setRows(res.data.data ?? []);
    setPeople(Object.fromEntries((res.data.people ?? []).map((p) => [p.id, p])));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function exportFor(r: Req) {
    const res = await callAdmin<{ data: unknown }>("export_member", { user_id: r.user_id, reason: `Data request #${r.id}` });
    if (!res.ok) return setNotice(res.error);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(res.data.data, null, 2)], { type: "application/json" }));
    a.download = `skilled9ja-data-request-${r.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setNotice("Downloaded. Email it to the member, then mark the request done.");
  }
  async function resolve(r: Req, status: "done" | "rejected") {
    const res = await callAdmin("resolve_data_request", { id: r.id, status, reason: status === "rejected" ? reason : "Completed" });
    if (!res.ok) return setNotice(res.error);
    setRejecting(null);
    setReason("");
    setNotice(status === "done" ? "Marked done." : "Marked as not done. The member sees your reason.");
    load();
  }

  const open = (rows ?? []).filter((r) => r.status === "open");
  const closed = (rows ?? []).filter((r) => r.status !== "open");

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold text-text-primary">Data requests</h1>
      <p className="text-sm text-text-secondary mt-1">
        Under the Nigeria Data Protection Act 2023 members can ask for a copy of their data or for it to be deleted. Answer within 30 days. Deleting is done from the member&apos;s panel in Members, which keeps payment records without their details.
      </p>
      {missing && <p className="mt-4 text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2" role="status">Requests arrive with the trust &amp; safety database update.</p>}
      {error && <p className="mt-4 text-sm font-semibold text-red-700" role="alert">{error}</p>}
      {notice && <p className="mt-3 text-sm font-semibold bg-white border border-gray-200 rounded-lg px-3 py-2" role="status">{notice}</p>}

      <h2 className="mt-6 font-semibold">Waiting ({open.length})</h2>
      <ul className="mt-2 space-y-3">
        {rows === null ? <li className="text-sm text-text-secondary">Loading…</li> : open.length === 0 ? <li className="text-sm text-text-secondary bg-white rounded-xl border border-gray-100 p-6 text-center">No open requests.</li> : open.map((r) => {
          const p = people[r.user_id];
          const left = 30 - Math.floor((Date.now() - new Date(r.created_at).getTime()) / DAY);
          return (
            <li key={r.id} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-semibold">{r.kind === "export" ? "Copy of their data" : "Delete their account"} · {p?.full_name ?? "Member"}</p>
                  <p className="text-xs text-text-secondary">{p?.email} · {p?.phone_number}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full self-start ${left <= 7 ? "bg-red-100 text-red-900" : "bg-gray-100 text-gray-800"}`}>{left > 0 ? `${left} days left` : "Overdue"}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {r.kind === "export" ? (
                  <button type="button" onClick={() => exportFor(r)} className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-semibold">Download their data</button>
                ) : (
                  <Link href={`/admin/users?q=${encodeURIComponent(p?.email ?? "")}`} className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-semibold">Open in Members to delete</Link>
                )}
                <button type="button" onClick={() => resolve(r, "done")} className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold">Mark done</button>
                <button type="button" onClick={() => { setRejecting(r.id); setReason(""); }} className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold">Can&apos;t do it</button>
              </div>
              {rejecting === r.id && (
                <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <label htmlFor={`dr-${r.id}`} className="block text-sm">Reason (the member sees this, e.g. an unpaid booking must finish first)</label>
                  <input id={`dr-${r.id}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                  <div className="mt-2 flex gap-2">
                    <button type="button" disabled={reason.trim().length < 5} onClick={() => resolve(r, "rejected")} className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50">Save</button>
                    <button type="button" onClick={() => setRejecting(null)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold">Cancel</button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {closed.length > 0 && (
        <>
          <h2 className="mt-6 font-semibold">Finished</h2>
          <ul className="mt-2 bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
            {closed.map((r) => (
              <li key={r.id} className="p-3 text-sm flex justify-between gap-3">
                <span>{r.kind === "export" ? "Copy" : "Deletion"} · {people[r.user_id]?.full_name ?? "Member"}</span>
                <span className="text-text-secondary">{r.status}{r.completed_at ? ` · ${new Date(r.completed_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}` : ""}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
