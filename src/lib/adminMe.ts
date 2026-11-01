"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type AdminRole = "owner" | "support";

export { OWNER_PATHS } from "@/lib/adminPaths";

/** The signed-in admin's role. Before the roles update every admin is an owner. */
export function useAdminRole(): AdminRole | null {
  const [role, setRole] = useState<AdminRole | null>(null);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: row, error } = await supabase.from("profiles").select("admin_role").eq("id", data.user.id).maybeSingle();
      setRole(!error && row?.admin_role === "support" ? "support" : "owner");
    });
  }, []);
  return role;
}

export interface WaitingCounts {
  reports: number | null;
  transfers: number | null;
  verifications: number | null;
  withdrawals: number | null;
  dataRequests: number | null;
}

/** Counts of work waiting for an admin. Refreshes every minute and when the tab regains focus. */
export function useWaitingCounts(): WaitingCounts {
  const [counts, setCounts] = useState<WaitingCounts>({ reports: null, transfers: null, verifications: null, withdrawals: null, dataRequests: null });
  useEffect(() => {
    let stop = false;
    const supabase = createClient();
    const count = async (table: string, col: string, val: string) => {
      const { count: n, error } = await supabase.from(table).select("id", { count: "exact", head: true }).eq(col, val);
      return error ? null : n ?? 0;
    };
    const load = async () => {
      if (document.visibilityState === "hidden") return;
      const [reports, transfers, verifications, withdrawals, dataRequests] = await Promise.all([
        count("content_reports", "status", "open"),
        count("user_payments", "status", "pending"),
        count("verifications", "status", "pending"),
        count("withdrawal_requests", "status", "pending"),
        count("data_requests", "status", "open"),
      ]);
      if (!stop) setCounts({ reports, transfers, verifications, withdrawals, dataRequests });
    };
    load();
    const t = window.setInterval(load, 60_000);
    document.addEventListener("visibilitychange", load);
    return () => {
      stop = true;
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", load);
    };
  }, []);
  return counts;
}
