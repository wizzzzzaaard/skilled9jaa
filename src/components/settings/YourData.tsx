"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Req { id: number; kind: "export" | "delete"; status: string; created_at: string; note: string | null }

/** Members can ask for a copy of their data or for their account to be deleted (Nigeria Data Protection Act 2023). */
export function YourData() {
  const [reqs, setReqs] = useState<Req[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [word, setWord] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await createClient().from("data_requests").select("id, kind, status, created_at, note").order("created_at", { ascending: false }).limit(10);
    if (error) setUnavailable(true);
    setReqs((data ?? []) as Req[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const openKind = (k: string) => (reqs ?? []).some((r) => r.kind === k && r.status === "open");

  async function ask(kind: "export" | "delete") {
    setBusy(true);
    const { data: u } = await createClient().auth.getUser();
    const { error } = await createClient().from("data_requests").insert({ kind, user_id: u.user?.id });
    setBusy(false);
    setConfirmDelete(false);
    setWord("");
    if (error && error.code !== "23505") return setMsg({ ok: false, text: "Couldn't send your request. Try again, or email us." });
    setMsg({
      ok: true,
      text: kind === "export" ? "Request sent. We'll email you a copy of your data within 30 days, usually much sooner." : "Request sent. We'll delete your account within 30 days and email you when it's done. You can keep using it until then.",
    });
    load();
  }

  return (
    <section aria-labelledby="your-data-h">
      <h3 id="your-data-h" className="text-lg font-semibold text-text-primary">Your data</h3>
      <p className="text-sm text-text-secondary mt-1">
        You can ask for a copy of everything we hold about you, or for your account to be deleted. See our <Link href="/privacy" className="underline">privacy policy</Link>.
      </p>
      {msg && <p className={`mt-3 text-sm font-semibold ${msg.ok ? "text-green-800" : "text-red-700"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</p>}
      {unavailable ? (
        <p className="mt-3 text-sm text-text-secondary">Email us to make a request; the in-app option is coming soon.</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={busy || openKind("export")} onClick={() => ask("export")} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold disabled:opacity-50">
              {openKind("export") ? "Copy requested" : "Get a copy of my data"}
            </button>
            {!confirmDelete && (
              <button type="button" disabled={busy || openKind("delete")} onClick={() => setConfirmDelete(true)} className="px-4 py-2 rounded-lg border border-red-200 text-red-800 text-sm font-semibold disabled:opacity-50">
                {openKind("delete") ? "Deletion requested" : "Delete my account"}
              </button>
            )}
          </div>
          {confirmDelete && (
            <div className="mt-3 p-4 rounded-lg border border-red-200 bg-red-50">
              <p className="text-sm font-semibold">Deleting removes your profile, posts, applications and ID documents. It can&apos;t be undone. Records of payments are kept for tax law, without your details.</p>
              <label htmlFor="yd-word" className="block text-sm mt-2">Type DELETE to confirm</label>
              <input id="yd-word" value={word} onChange={(e) => setWord(e.target.value)} className="mt-1 w-40 rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              <div className="mt-3 flex gap-2">
                <button type="button" disabled={busy || word !== "DELETE"} onClick={() => ask("delete")} className="px-4 py-2 rounded-lg bg-red-700 text-white text-sm font-semibold disabled:opacity-50">Ask to delete my account</button>
                <button type="button" onClick={() => { setConfirmDelete(false); setWord(""); }} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold">Cancel</button>
              </div>
            </div>
          )}
          {!!reqs?.length && (
            <ul className="mt-3 text-sm text-text-secondary space-y-1">
              {reqs.map((r) => (
                <li key={r.id}>
                  {r.kind === "export" ? "Copy of data" : "Account deletion"} · {new Date(r.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })} · {r.status === "open" ? "in progress" : r.status === "done" ? "done" : `not done${r.note ? `: ${r.note}` : ""}`}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
