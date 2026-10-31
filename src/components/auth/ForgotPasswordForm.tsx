"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { explainAuthError } from "@/lib/utils/safeRedirect";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLoading) return;
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) {
      setError("Enter an email address like name@example.com.");
      return;
    }
    setError(null);
    setIsLoading(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(clean, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);
    // Rate limits and network problems are worth showing; "no such user" is not,
    // so nobody can use this form to find out who has an account.
    if (resetError && /rate|too many|fetch|network/i.test(resetError.message)) {
      setError(explainAuthError(resetError.message));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div role="status" className="space-y-2">
        <p className="font-semibold text-text-primary">Check your email</p>
        <p className="text-sm text-text-secondary">
          If {email.trim().toLowerCase()} has a Skilled9ja account, a reset link is on its way. It can take a minute;
          check your spam folder too.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Input label="Email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      {error && <p role="alert" className="text-sm font-semibold text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <Button type="submit" variant="primary" size="md" isLoading={isLoading} className="w-full">
        Send reset link
      </Button>
    </form>
  );
}
