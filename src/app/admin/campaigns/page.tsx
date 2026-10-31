"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CAMPAIGNS, CAMPAIGN_CHANNELS, campaignUrl, type Campaign } from "@/lib/campaigns";

type Stats = Record<string, { signups: number; active: number; bySource: Record<string, number> }>;

const AUDIENCE_LABEL: Record<Campaign["audience"], string> = {
  provider: "Providers",
  job_seeker: "Job seekers",
  company: "Companies",
  client: "Clients",
};

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older Android browsers: fall back to a hidden textarea.
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function AdminCampaignsPage() {
  const [origin, setOrigin] = useState("https://skilled9ja.com");
  const [filter, setFilter] = useState<Campaign["audience"] | "all">("all");
  const [copied, setCopied] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsNote, setStatsNote] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(process.env.NEXT_PUBLIC_SITE_URL || window.location.origin);
  }, []);

  // Signups per page. Needs the `signup_niche` columns from the attribution migration.
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("signup_niche, utm_source, account_status")
      .not("signup_niche", "is", null)
      .limit(10000)
      .then(({ data, error }) => {
        if (error) {
          setStatsNote("Signup counts appear here once the attribution database update is applied.");
          return;
        }
        const out: Stats = {};
        for (const row of (data ?? []) as { signup_niche: string; utm_source: string | null; account_status: string }[]) {
          const s = (out[row.signup_niche] ??= { signups: 0, active: 0, bySource: {} });
          s.signups += 1;
          if (row.account_status === "active") s.active += 1;
          const src = row.utm_source || "direct";
          s.bySource[src] = (s.bySource[src] ?? 0) + 1;
        }
        setStats(out);
      });
  }, []);

  const list = useMemo(() => CAMPAIGNS.filter((c) => filter === "all" || c.audience === filter), [filter]);

  async function copy(key: string, text: string) {
    const ok = await copyText(text);
    setCopied(ok ? key : `fail:${key}`);
    window.setTimeout(() => setCopied((k) => (k === key || k === `fail:${key}` ? null : k)), 2000);
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <h1 className="text-2xl font-semibold text-text-primary">Campaign links</h1>
      <p className="text-text-secondary mt-1 max-w-2xl">
        Each page signs people up with their skill already chosen. Copy the link for the channel you're promoting on,
        so you can see which promotions bring signups.
      </p>

      <div className="flex flex-wrap gap-2 mt-6" role="group" aria-label="Filter by audience">
        {(["all", "provider", "job_seeker", "company", "client"] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setFilter(a)}
            aria-pressed={filter === a}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${
              filter === a ? "bg-primary text-white border-primary" : "bg-white text-text-primary border-gray-200"
            }`}
          >
            {a === "all" ? "All pages" : AUDIENCE_LABEL[a]}
          </button>
        ))}
      </div>

      {statsNote && <p className="mt-4 text-sm text-text-secondary bg-white border border-gray-200 rounded-lg p-3">{statsNote}</p>}

      <ul className="mt-6 space-y-4">
        {list.map((c) => {
          const base = campaignUrl(origin, c.slug);
          const st = stats?.[c.slug];
          return (
            <li key={c.slug} className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-text-primary text-lg">/{c.slug}</h2>
                  <p className="text-sm text-text-secondary">
                    {AUDIENCE_LABEL[c.audience]} · {c.headline}
                  </p>
                </div>
                <div className="flex gap-4 text-sm">
                  <div>
                    <div className="text-text-secondary">Signups</div>
                    <div className="font-semibold text-lg">{st ? st.signups : "–"}</div>
                  </div>
                  <div>
                    <div className="text-text-secondary">Active</div>
                    <div className="font-semibold text-lg">{st ? st.active : "–"}</div>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="text-sm bg-surface border border-gray-200 rounded px-2 py-1 break-all">{base}</code>
                <button
                  type="button"
                  onClick={() => copy(`${c.slug}:base`, base)}
                  className="text-sm font-semibold text-primary underline underline-offset-2"
                >
                  {copied === `${c.slug}:base` ? "Copied" : copied === `fail:${c.slug}:base` ? "Copy failed" : "Copy link"}
                </button>
                <a href={base} target="_blank" rel="noreferrer" className="text-sm font-semibold text-text-secondary underline underline-offset-2">
                  Open page
                </a>
              </div>

              <div className="mt-3 flex flex-wrap gap-2" aria-label={`Tracked links for /${c.slug}`}>
                {CAMPAIGN_CHANNELS.map((ch) => {
                  const key = `${c.slug}:${ch.key}`;
                  const url = campaignUrl(origin, c.slug, ch.key, ch.medium);
                  const n = st?.bySource[ch.key];
                  return (
                    <button
                      key={ch.key}
                      type="button"
                      onClick={() => copy(key, url)}
                      title={url}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 hover:border-primary"
                    >
                      {copied === key ? "Copied" : copied === `fail:${key}` ? "Copy failed" : `Copy ${ch.label} link`}
                      {typeof n === "number" ? ` (${n})` : ""}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="sr-only" aria-live="polite">
        {copied && !copied.startsWith("fail:") ? "Link copied" : ""}
      </p>
    </div>
  );
}
