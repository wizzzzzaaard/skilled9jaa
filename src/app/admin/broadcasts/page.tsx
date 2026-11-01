"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Broadcast { id: string; title: string; message: string; target_role: string | null; sent_at: string | null; modal_active: boolean | null }
const TARGETS: Record<string, string> = { all: "Everyone", artisan: "Artisans & job seekers", home_service_provider: "Home-service providers", company: "Companies", client: "Clients" };
const MAX = 400;

export default function AdminBroadcastsPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState("all");
  const [list, setList] = useState<Broadcast[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data } = await createClient().from("broadcasts").select("id, title, message, target_role, sent_at, modal_active").order("sent_at", { ascending: false, nullsFirst: false }).limit(30);
    setList((data ?? []) as Broadcast[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function send() {
    setBusy(true);
    const { data: u } = await createClient().auth.getUser();
    const { error } = await createClient().from("broadcasts").insert({ title: title.trim(), message: message.trim(), target_role: target, type: "announcement", sent_at: new Date().toISOString(), sent_by: u.user?.id, modal_active: true, show_modal: false });
    setBusy(false);
    setConfirming(false);
    if (error) return setMsg({ ok: false, text: "Couldn't send it. Try again." });
    setMsg({ ok: true, text: `Sent. ${TARGETS[target]} see it as a banner next time they open the app, for 30 days or until they close it.` });
    setTitle("");
    setMessage("");
    load();
  }

  async function stop(b: Broadcast) {
    const { error } = await createClient().from("broadcasts").update({ modal_active: false }).eq("id", b.id);
    if (error) return setMsg({ ok: false, text: "Couldn't stop it." });
    setMsg({ ok: true, text: `"${b.title}" is no longer shown.` });
    load();
  }

  const ready = title.trim().length >= 3 && message.trim().length >= 5;
  const active = (b: Broadcast) => b.modal_active !== false && !!b.sent_at && Date.now() - new Date(b.sent_at).getTime() < 30 * 86_400_000;

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold text-text-primary">Broadcasts</h1>
      <p className="text-sm text-text-secondary mt-1">Announcements appear as a banner at the top of the app for the members you choose.</p>
      {msg && <p className={`mt-4 text-sm font-semibold ${msg.ok ? "text-green-800" : "text-red-700"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</p>}

      <div className="mt-5 bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <div>
          <label htmlFor="bc-title" className="block text-sm font-semibold">Title</label>
          <input id="bc-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="e.g. New jobs in Abuja this week" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="bc-msg" className="block text-sm font-semibold">Message</label>
          <textarea id="bc-msg" rows={4} value={message} onChange={(e) => setMessage(e.target.value.slice(0, MAX))} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <p className="text-xs text-text-secondary text-right">{message.length}/{MAX}</p>
        </div>
        <div>
          <label htmlFor="bc-target" className="block text-sm font-semibold">Who sees it</label>
          <select id="bc-target" value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white">
            {Object.entries(TARGETS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {ready && (
          <div>
            <p className="text-xs font-semibold text-text-secondary mb-1">Preview</p>
            <div className="bg-[#FFF4CC] border border-[#F4B400]/50 rounded-lg px-4 py-3 text-sm text-[#3d2e00]">
              <p className="font-semibold">{title}</p>
              <p className="whitespace-pre-line break-words">{message}</p>
            </div>
          </div>
        )}
        {confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">Send to {TARGETS[target].toLowerCase()}?</span>
            <button type="button" disabled={busy} onClick={send} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold">{busy ? "Sending…" : "Send now"}</button>
            <button type="button" onClick={() => setConfirming(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold">Cancel</button>
          </div>
        ) : (
          <button type="button" disabled={!ready} onClick={() => setConfirming(true)} className="w-full px-4 py-3 rounded-lg bg-primary text-white font-semibold disabled:opacity-50">Send broadcast</button>
        )}
      </div>

      <h2 className="mt-8 font-semibold">Sent</h2>
      <ul className="mt-2 bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {list === null ? <li className="p-4 text-sm text-text-secondary">Loading…</li> : list.length === 0 ? <li className="p-4 text-sm text-text-secondary">Nothing sent yet.</li> : list.map((b) => (
          <li key={b.id} className="p-4 flex flex-wrap items-start gap-3">
            <div className="flex-1 min-w-[200px]">
              <p className="font-semibold">{b.title}</p>
              <p className="text-sm text-text-secondary break-words">{b.message}</p>
              <p className="text-xs text-text-secondary mt-1">{TARGETS[b.target_role ?? "all"] ?? b.target_role} · {b.sent_at ? new Date(b.sent_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "Not dated"} · {active(b) ? <span className="text-green-800 font-semibold">Showing</span> : "Ended"}</p>
            </div>
            {active(b) && <button type="button" onClick={() => stop(b)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold">Stop showing</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}
