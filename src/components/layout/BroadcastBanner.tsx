"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/profile";

interface Broadcast { id: string; title: string; message: string; target_role: string | null; sent_at: string | null; modal_active: boolean | null }
const SEEN_KEY = "s9-dismissed-broadcasts";

function dismissed(): string[] {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"); } catch { return []; }
}
function matches(b: Broadcast, u: Profile) {
  const t = b.target_role ?? "all";
  if (t === "all") return true;
  if (t === "artisan") return !!u.is_artisan;
  if (t === "company") return !!u.is_company;
  if (t === "home_service_provider") return !!u.is_home_service_provider;
  if (t === "client") return !u.is_artisan && !u.is_company && !u.is_home_service_provider;
  return false;
}

/** Shows the newest admin announcement for this member until they close it. */
export function BroadcastBanner({ user }: { user: Profile }) {
  const [b, setB] = useState<Broadcast | null>(null);
  useEffect(() => {
    createClient()
      .from("broadcasts")
      .select("id, title, message, target_role, sent_at, modal_active")
      .neq("modal_active", false)
      .gte("sent_at", new Date(Date.now() - 30 * 86_400_000).toISOString())
      .order("sent_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        const seen = dismissed();
        setB(((data ?? []) as Broadcast[]).find((x) => matches(x, user) && !seen.includes(x.id)) ?? null);
      });
  }, [user]);
  if (!b) return null;
  const close = () => {
    try { localStorage.setItem(SEEN_KEY, JSON.stringify([...dismissed(), b.id].slice(-50))); } catch { /* not saved: shows again next visit */ }
    setB(null);
  };
  return (
    <div role="region" aria-label="Announcement" className="bg-[#FFF4CC] border-b border-[#F4B400]/50">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-start gap-3">
        <div className="flex-1 min-w-0 text-sm text-[#3d2e00]">
          <p className="font-semibold">{b.title}</p>
          <p className="whitespace-pre-line break-words">{b.message}</p>
        </div>
        <button type="button" onClick={close} className="p-1 -m-1 text-[#3d2e00]" aria-label="Close announcement">
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
