"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/utils/safeRedirect";

function TwoStepInner() {
  const router = useRouter();
  const next = safeNext(useSearchParams()?.get("next"), "/admin");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    const factor = (data?.totp ?? []).find((f) => f.status === "verified");
    if (!factor) {
      setBusy(false);
      return router.replace(next);
    }
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.replace(/\D/g, "") });
    setBusy(false);
    if (err) return setError("That code didn't work. Use the code showing in your app now.");
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 p-6">
        <h1 className="text-xl font-semibold text-text-primary">Enter your code</h1>
        <p className="text-sm text-text-secondary mt-1">Open your authenticator app and type the 6-digit code for Skilled9ja.</p>
        <label htmlFor="ts-code" className="sr-only">6-digit code</label>
        <input id="ts-code" autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} className="mt-4 w-full rounded-lg border border-gray-200 px-3 py-3 text-2xl tracking-[0.4em] text-center font-mono" />
        {error && <p className="mt-2 text-sm font-semibold text-red-700" role="alert">{error}</p>}
        <button type="submit" disabled={busy || code.replace(/\D/g, "").length !== 6} className="mt-4 w-full px-4 py-3 rounded-lg bg-primary text-white font-semibold disabled:opacity-50">{busy ? "Checking…" : "Continue"}</button>
      </form>
    </div>
  );
}

export default function TwoStepPage() {
  return <Suspense><TwoStepInner /></Suspense>;
}
