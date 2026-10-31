import { normalizeState } from "@/lib/nigeria-places";

export interface JobFilters {
  q: string;
  state: string;
  type: string;
  minPay: number | null;
  perks: string[]; // perk ids
}

export const EMPTY_FILTERS: JobFilters = { q: "", state: "", type: "", minPay: null, perks: [] };

/** Filters live in the URL so a search can be shared or linked from a campaign. */
export function filtersFromSearch(search: string): JobFilters {
  const p = new URLSearchParams(search);
  const pay = Number(p.get("pay") ?? "");
  return {
    q: (p.get("q") ?? "").slice(0, 60),
    state: normalizeState(p.get("state") ?? ""),
    type: p.get("type") ?? "",
    minPay: Number.isFinite(pay) && pay > 0 ? pay : null,
    perks: (p.get("perks") ?? "").split(",").filter(Boolean).slice(0, 10),
  };
}

export function filtersToSearch(f: JobFilters): string {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.state) p.set("state", f.state);
  if (f.type) p.set("type", f.type);
  if (f.minPay) p.set("pay", String(f.minPay));
  if (f.perks.length) p.set("perks", f.perks.join(","));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function activeFilterCount(f: JobFilters): number {
  return (f.q ? 1 : 0) + (f.state ? 1 : 0) + (f.type ? 1 : 0) + (f.minPay ? 1 : 0) + f.perks.length;
}

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

export function formatPay(min: number | null, max: number | null, period = "monthly"): string | null {
  const per = period === "monthly" || !period ? "a month" : period === "yearly" ? "a year" : `per ${period}`;
  if (min && max && min !== max) return `${naira(min)} to ${naira(max)} ${per}`;
  if (min || max) return `${naira((min || max)!)} ${per}`;
  return null;
}

export function postedAgo(iso: string, now = Date.now()): string {
  const days = Math.floor((now - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Posted today";
  if (days === 1) return "Posted yesterday";
  if (days < 7) return `Posted ${days} days ago`;
  if (days < 14) return "Posted 1 week ago";
  if (days < 60) return `Posted ${Math.floor(days / 7)} weeks ago`;
  return `Posted ${Math.floor(days / 30)} months ago`;
}

export function isClosed(deadline: string | null | undefined, now = Date.now()): boolean {
  return !!deadline && new Date(deadline).getTime() < now;
}

export interface Employer {
  id: string;
  name: string | null;
  logo_url: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = { from: (t: string) => any };

/**
 * Names and logos of the companies behind a set of jobs. Uses the public
 * `public_employers` view when it exists (no contact details, readable when
 * logged out); otherwise falls back to profiles, which only signed-in users can read.
 */
export async function loadEmployers(supabase: Client, ids: string[]): Promise<Record<string, Employer>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return {};
  const out: Record<string, Employer> = {};
  const view = await supabase.from("public_employers").select("id, name, logo_url").in("id", unique);
  if (!view.error && view.data) {
    for (const e of view.data as Employer[]) out[e.id] = e;
    return out;
  }
  const prof = await supabase.from("profiles").select("id, company_name, full_name, company_logo_url, profile_image_url").in("id", unique);
  for (const p of (prof.data ?? []) as { id: string; company_name: string | null; full_name: string | null; company_logo_url: string | null; profile_image_url: string | null }[]) {
    out[p.id] = { id: p.id, name: p.company_name || p.full_name, logo_url: p.company_logo_url || p.profile_image_url };
  }
  return out;
}

/** Text for sharing a job on WhatsApp and other apps. */
export function shareText(title: string, place: string | null, pay: string | null, url: string): string {
  return [`${title}${place ? ` in ${place}` : ""}`, pay, `Apply on Skilled9ja: ${url}`].filter(Boolean).join("\n");
}
