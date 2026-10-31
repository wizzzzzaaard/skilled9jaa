import { createClient } from "@supabase/supabase-js";

export interface PublicStats {
  openJobs: number;
  states: number;
  employers: number;
}

/**
 * Real numbers for public pages, from data anyone may read (active jobs).
 * Returns null when the database can't be reached, so pages hide the
 * numbers instead of showing zeros or invented figures.
 */
export async function getPublicStats(): Promise<PublicStats | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await supabase
      .from("jobs")
      .select("state, employer_id")
      .eq("status", "active")
      .limit(5000);
    if (error || !data) return null;
    const rows = data as { state: string | null; employer_id: string | null }[];
    return {
      openJobs: rows.length,
      states: new Set(rows.map((r) => r.state).filter(Boolean)).size,
      employers: new Set(rows.map((r) => r.employer_id).filter(Boolean)).size,
    };
  } catch {
    return null;
  }
}
