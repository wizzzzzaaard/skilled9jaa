"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useUIStore } from "@/store/uiStore";
import { explainAuthError, safeNext } from "@/lib/utils/safeRedirect";

export function LoginForm() {
  const router = useRouter();
  const { addToast } = useUIStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLoading) return;
    setError(null);
    setIsLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) {
      setError(explainAuthError(authError.message));
      setIsLoading(false);
      return;
    }

    addToast("Logged in", "success");
    // Return to the page that sent them here (only paths on this site).
    const next = safeNext(new URLSearchParams(window.location.search).get("next"));
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <div className="text-right -mt-2">
        <Link href="/forgot-password" className="text-sm font-semibold text-primary underline underline-offset-2">
          Forgot password?
        </Link>
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-red-700 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" size="md" isLoading={isLoading} className="w-full">
        Log in
      </Button>
    </form>
  );
}
