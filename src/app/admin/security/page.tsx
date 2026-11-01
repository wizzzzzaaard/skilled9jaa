"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

interface Factor { id: string; friendly_name?: string | null; status: string; created_at: string; factor_type: string }

function SecurityInner() {
  const required = useSearchParams()?.get("required") === "1";
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enrol, setEnrol] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    const { data, error } = await createClient().auth.mfa.listFactors();
    if (error) return setMsg({ ok: false, text: "Couldn't load your sign-in settings." });
    setFactors(((data?.all ?? []) as Factor[]).filter((f) => f.factor_type === "totp"));
  }
  useEffect(() => { load(); }, []);

  const verified = (factors ?? []).filter((f) => f.status === "verified");

  async function start() {
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    // Clear any half-finished setup first.
    for (const f of (factors ?? []).filter((x) => x.status !== "verified")) await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}` });
    setBusy(false);
    if (error || !data) return setMsg({ ok: false, text: error?.message ?? "Couldn't start setup." });
    setEnrol({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!enrol) return;
    setBusy(true);
    const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId: enrol.id, code: code.replace(/\D/g, "") });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: "That code didn't work. Codes change every 30 seconds, so try the current one." });
    setEnrol(null);
    setCode("");
    setMsg({ ok: true, text: "Two-step login is on. You'll enter a code from the app each time you sign in to the admin." });
    load();
  }

  async function remove(id: string) {
    setBusy(true);
    const { error } = await createClient().auth.mfa.unenroll({ factorId: id });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: "Couldn't remove it. Sign in again with your code, then try." });
    setMsg({ ok: true, text: "Removed." });
    load();
  }

  return (
    <div className="p-4 sm:p-8 max-w-xl">
      <h1 className="text-2xl font-semibold text-text-primary">Two-step login</h1>
      <p className="text-sm text-text-secondary mt-1">
        Admins can see members&apos; details and approve money, so a password alone isn&apos;t enough. With two-step login you also enter a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator or Authy).
      </p>
      {required && verified.length === 0 && (
        <p className="mt-4 text-sm font-semibold bg-amber-50 border border-amber-200 rounded-lg px-3 py-2" role="alert">Set up two-step login to keep using the admin.</p>
      )}
      {msg && <p className={`mt-4 text-sm font-semibold ${msg.ok ? "text-green-800" : "text-red-700"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</p>}

      <div className="mt-5 bg-white rounded-xl border border-gray-100 p-5">
        {factors === null ? (
          <p className="text-sm text-text-secondary">Loading…</p>
        ) : enrol ? (
          <form onSubmit={confirm}>
            <ol className="text-sm space-y-2 list-decimal pl-5">
              <li>Open your authenticator app and add an account.</li>
              <li>Scan this code, or type the key below.</li>
            </ol>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enrol.qr} alt="QR code for your authenticator app" width={180} height={180} className="mt-3 bg-white border border-gray-100 rounded-lg" />
            <p className="mt-2 text-xs text-text-secondary">Key: <span className="font-mono text-text-primary select-all break-all">{enrol.secret}</span></p>
            <label htmlFor="mfa-code" className="block text-sm font-semibold mt-4">3. Enter the 6-digit code it shows</label>
            <input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} className="mt-1 w-40 rounded-lg border border-gray-200 px-3 py-2 text-lg tracking-widest font-mono" />
            <div className="mt-4 flex gap-2">
              <button type="submit" disabled={busy || code.replace(/\D/g, "").length !== 6} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50">{busy ? "Checking…" : "Turn on"}</button>
              <button type="button" onClick={() => setEnrol(null)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold">Cancel</button>
            </div>
          </form>
        ) : verified.length ? (
          <>
            <p className="font-semibold text-green-800">Two-step login is on.</p>
            <ul className="mt-3 space-y-2">
              {verified.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>{f.friendly_name || "Authenticator app"} · added {new Date(f.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</span>
                  <button type="button" disabled={busy} onClick={() => remove(f.id)} className="px-3 py-1.5 rounded-lg border border-red-200 text-red-800 text-xs font-semibold">Remove</button>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-text-secondary">Lost your phone? Another owner admin can&apos;t remove this for you; contact Supabase support or reset it from the Supabase dashboard (Authentication › Users).</p>
          </>
        ) : (
          <>
            <p className="font-semibold">Two-step login is off.</p>
            <button type="button" onClick={start} disabled={busy} className="mt-3 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50">Set it up</button>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminSecurityPage() {
  return <Suspense><SecurityInner /></Suspense>;
}
