"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { explainAuthError } from "@/lib/utils/safeRedirect";

type State = "checking" | "ready" | "expired" | "done";

export function ResetPasswordForm() {
  const router = useRouter();
  const [state, setState] = useState<State>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The email link signs the person in for this one purpose. The browser
  // client swaps the code in the URL for a session; wait for it.
  useEffect(() => {
    const supabase = createClient();
    let settled = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        settled = true;
        setState("ready");
      }
    });
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    (async () => {
      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
        if (!exErr) {
          settled = true;
          setState("ready");
          return;
        }
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        settled = true;
        setState("ready");
      } else {
        window.setTimeout(() => !settled && setState("expired"), 2500);
      }
    })();
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLoading) return;
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError("Use at least 8 characters, with a letter and a number.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setError(null);
    setIsLoading(true);
    const supabase = createClient();
    const { error: upErr } = await supabase.auth.updateUser({ password });
    setIsLoading(false);
    if (upErr) {
      setError(explainAuthError(upErr.message));
      return;
    }
    setState("done");
    window.setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1200);
  }

  if (state === "checking") return <p role="status" className="text-text-secondary">Checking your reset link…</p>;
  if (state === "expired")
    return (
      <div role="alert" className="space-y-3">
        <p className="font-semibold text-text-primary">This reset link has expired or was already used.</p>
        <Link href="/forgot-password" className="text-primary font-semibold underline">Send a new link</Link>
      </div>
    );
  if (state === "done") return <p role="status" className="font-semibold text-text-primary">Password changed. Taking you to your dashboard…</p>;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Input label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <Input label="Type it again" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      <p className="text-sm text-text-secondary">At least 8 characters, with a letter and a number.</p>
      {error && <p role="alert" className="text-sm font-semibold text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <Button type="submit" variant="primary" size="md" isLoading={isLoading} className="w-full">
        Save new password
      </Button>
    </form>
  );
}
