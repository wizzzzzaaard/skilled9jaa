"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { naira } from "@/lib/payments";

interface Req { id: number; amount: number; status: string; created_at: string; rejection_reason: string | null; net_amount: number | null }
const MIN = 1000;
const STATUS: Record<string, string> = { pending: "Waiting for payout", paid: "Paid", rejected: "Not approved" };

/** Lets a member ask for their wallet balance to be paid to their bank. Admins pay it in Admin › Withdrawals. */
export function WithdrawPanel({ userId, balance }: { userId: string; balance: number }) {
  const [reqs, setReqs] = useState<Req[] | null>(null);
  const [feePct, setFeePct] = useState(0);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [bank, setBank] = useState("");
  const [account, setAccount] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [r, s] = await Promise.all([
      supabase.from("withdrawal_requests").select("id, amount, status, created_at, rejection_reason, net_amount").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
      supabase.from("platform_settings").select("withdrawal_fee_pct").eq("id", 1).maybeSingle(),
    ]);
    setReqs((r.data ?? []) as Req[]);
    setFeePct(Number(s.data?.withdrawal_fee_pct ?? 0));
  }, [userId]);
  useEffect(() => { load(); }, [load]);

  const pending = (reqs ?? []).some((r) => r.status === "pending");
  const n = Number(amount);
  const fee = Math.round(n * feePct) / 100;
  const problem =
    !(n >= MIN) ? `The smallest withdrawal is ${naira(MIN)}.` :
    n > balance ? "That's more than your balance." :
    !bank.trim() ? "Enter your bank." :
    !/^\d{10}$/.test(account) ? "Account numbers have 10 digits." :
    name.trim().length < 3 ? "Enter the name on the account." : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (problem) return setMsg({ ok: false, text: problem });
    setBusy(true);
    const { error } = await createClient().from("withdrawal_requests").insert({
      user_id: userId,
      amount: n,
      status: "pending",
      bank_details: { bank_name: bank.trim(), account_number: account, account_name: name.trim() },
    });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: "Couldn't send your request. Try again." });
    setMsg({ ok: true, text: "Request sent. Payouts usually reach your bank within 1 to 2 working days." });
    setOpen(false);
    setAmount("");
    load();
  }

  const field = "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm";
  return (
    <section className="bg-white rounded-xl border border-gray-100 p-6 mb-6" aria-labelledby="wd-h">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="wd-h" className="text-lg font-semibold text-text-primary">Withdraw to your bank</h2>
        {!open && (
          <button type="button" onClick={() => { setOpen(true); setMsg(null); }} disabled={pending || balance < MIN} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50">Withdraw</button>
        )}
      </div>
      <p className="text-sm text-text-secondary mt-1">
        {pending ? "You have a withdrawal waiting. You can ask for another once it's paid." : balance < MIN ? `You can withdraw once your balance reaches ${naira(MIN)}.` : `Minimum ${naira(MIN)}.${feePct ? ` A ${feePct}% fee is taken from each withdrawal.` : ""}`}
      </p>
      {msg && <p className={`mt-3 text-sm font-semibold ${msg.ok ? "text-green-800" : "text-red-700"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</p>}
      {open && (
        <form onSubmit={submit} className="mt-4 grid sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="wd-amt" className="text-sm font-semibold">Amount (₦)</label>
            <input id="wd-amt" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} className={field} />
            {n >= MIN && feePct > 0 && <p className="text-xs text-text-secondary mt-1">You&apos;ll receive {naira(n - fee)} after the {naira(fee)} fee.</p>}
          </div>
          <div>
            <label htmlFor="wd-bank" className="text-sm font-semibold">Bank</label>
            <input id="wd-bank" value={bank} onChange={(e) => setBank(e.target.value)} placeholder="e.g. GTBank, Opay, Moniepoint" className={field} />
          </div>
          <div>
            <label htmlFor="wd-acct" className="text-sm font-semibold">Account number</label>
            <input id="wd-acct" inputMode="numeric" maxLength={10} value={account} onChange={(e) => setAccount(e.target.value.replace(/\D/g, ""))} className={field} />
          </div>
          <div>
            <label htmlFor="wd-name" className="text-sm font-semibold">Name on the account</label>
            <input id="wd-name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50">{busy ? "Sending…" : "Request withdrawal"}</button>
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold">Cancel</button>
          </div>
        </form>
      )}
      {!!reqs?.length && (
        <ul className="mt-4 divide-y divide-gray-50 text-sm">
          {reqs.map((r) => (
            <li key={r.id} className="py-2 flex justify-between gap-3">
              <span>{naira(Number(r.amount))} · {new Date(r.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</span>
              <span className={r.status === "rejected" ? "text-red-800" : r.status === "paid" ? "text-green-800" : "text-text-secondary"}>
                {STATUS[r.status] ?? r.status}{r.status === "rejected" && r.rejection_reason ? `: ${r.rejection_reason}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
