"use client";

import { createClient } from "@/lib/supabase/client";

export type AdminResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string; notDeployed?: boolean };

/** Calls the admin-actions server function (admin check and audit log happen there). */
export async function callAdmin<T = unknown>(action: string, body: Record<string, unknown> = {}, fn = "admin-actions"): Promise<AdminResult<T>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${fn}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      },
      body: JSON.stringify({ action, ...body }),
    });
    if (res.status === 404) return { ok: false, error: "This needs the admin-actions server function, which isn't deployed yet.", notDeployed: true };
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json.error ?? `Request failed (${res.status})` };
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: "Can't reach the server. Check your connection." };
  }
}
