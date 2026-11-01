"use client";

import { useCallback, useEffect, useState } from "react";
import { callAdmin } from "@/lib/admin";
import { naira } from "@/lib/payments";

interface W { id: number; user_id: string; amount: number; status: string; created_at: string; processed_at: string | null; bank_details: Record<string, string> | null; rejection_reason: string | null; fee_charged: number | null; net_amount: number | null }
interface Person { id: string; full_name: string | null; email: string | null; phone_number: string | null }

export default function WithdrawalsPage() {
  const [rows, setRows] = useState<W[] | null>(null);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<"pending" | "done">("pending");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [acting, setActing] = useState<{ w: W; decision: "paid" | "rejected" } | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    const res = await callAdmin<{ data: W[]; people: Person[]; wallets: { user_id: string; balance: number }[] }>("list_withdrawals");
    if (!res.ok) { setError(res.error); setRows([]); return; }
    setRows(res.data.data ?? []);
    setPeople(Object.fromEntries((res.data.people ?? []).map((p) => [p.id, p])));
    setBalances(Object.fromEntries((res.data.wallets ?? []).map((w) => [w.user_id, Number(w.balance)])));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function confirm() {
    if (!acting) return;
    const res = await callAdmin("process_withdrawal", { id: acting.w.id, decision: acting.decision, reason });
    if (!res.ok) return setNotice(res.error);
    setNotice(acting.decision === "paid" ? "Marked as paid and taken from their wallet." : "Rejected. The money stays in their wallet.");
    setActing(null);
    setReason("");
    load();
  }

  const shown = (rows ?? []).filter((w) => (tab === "pending" ? w.status === "pending" : w.status !== "pending"));

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold text-text-primary">Withdrawals</h1>
      <p className="text-sm text-text-secondary mt-1">Pay the member from the company bank account first, then mark it paid here. The platform withdrawal fee from Settings is recorded on each one.</p>
      <div role="tablist" aria-label="Withdrawal status" className="mt-4 inline-flex rounded-lg border border-gray-200 bg-white p-1">
        {(["pending", "done"] as const).map((t) => (
          <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-md text-sm font-semibold ${tab === t ? "bg-primary text-white" : "text-text-secondary"}`}>{t === "pending" ? "Waiting" : "Done"}</button>
        ))}
      </div>
      {notice && <p className="mt-3 text-sm font-semibold bg-white border border-gray-200 rounded-lg px-3 py-2" role="status">{notice}</p>}
      {error && <p className="mt-4 text-sm font-semibold text-red-700" role="alert">{error}</p>}
      <ul className="mt-4 space-y-3">
        {rows === null ? (
          <li className="text-sm text-text-secondary">Loading…</li>
        ) : shown.length === 0 ? (
          <li className="text-sm text-text-secondary bg-white rounded-xl border border-gray-100 p-6 text-center">{tab === "pending" ? "No withdrawals waiting." : "None yet."}</li>
        ) : (
          shown.map((w) => {
            const p = people[w.user_id];
            const bank = w.bank_details ?? {};
            const low = (balances[w.user_id] ?? 0) < Number(w.amount);
            return (
              <li key={w.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-semibold">{p?.full_name ?? "Member"} · {naira(Number(w.amount))}</p>
                    <p className="text-xs text-text-secondary">{p?.email} · {p?.phone_number} · asked {new Date(w.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</p>
                  </div>
                  <span className="text-xs font-semibold capitalize">{w.status}</span>
                </div>
                <p className="text-sm mt-2">Pay to: <span className="font-semibold">{[bank.account_name, bank.account_number, bank.bank_name].filter(Boolean).join(" · ") || "No bank details given"}</span></p>
                {w.status === "pending" && <p className={`text-xs mt-1 ${low ? "text-red-700 font-semibold" : "text-text-secondary"}`}>Wallet balance: {naira(balances[w.user_id] ?? 0)}{low ? " (less than requested)" : ""}</p>}
                {w.status === "paid" && <p className="text-xs text-text-secondary mt-1">Fee {naira(Number(w.fee_charged ?? 0))}, sent {naira(Number(w.net_amount ?? w.amount))}</p>}
                {w.status === "rejected" && <p className="text-xs text-red-800 mt-1">Rejected: {w.rejection_reason}</p>}
                {w.status === "pending" && (acting?.w.id === w.id ? (
                  <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <p className="text-sm font-semibold">{acting.decision === "paid" ? "Have you sent the money?" : "Reject this withdrawal?"}</p>
                    <label htmlFor={`w-${w.id}`} className="block text-sm mt-2">{acting.decision === "paid" ? "Bank transfer reference (optional)" : "Reason (the member sees this)"}</label>
                    <input id={`w-${w.id}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={confirm} disabled={acting.decision === "rejected" && reason.trim().length < 3} className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50">Confirm</button>
                      <button type="button" onClick={() => setActing(null)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <button type="button" disabled={low} onClick={() => { setActing({ w, decision: "paid" }); setReason(""); }} className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50">Mark as paid</button>
                    <button type="button" onClick={() => { setActing({ w, decision: "rejected" }); setReason(""); }} className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold">Reject</button>
                  </div>
                ))}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
