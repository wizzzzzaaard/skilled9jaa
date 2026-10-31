"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/profile";

interface Item {
  key: string;
  label: string;
  why: string;
  href: string;
  done: boolean;
}

interface Counts {
  skills: number;
  posts: number;
  jobs: number;
  verificationPending: boolean;
}

/** What "finished" means for each kind of account. */
export function checklistFor(user: Profile, c: Counts): Item[] {
  const verified = user.verification_status === "verified";
  const base = {
    photo: { key: "photo", label: "Add a profile photo", why: "Profiles with a clear face photo get contacted far more.", href: "/profile?tab=setup", done: !!user.profile_image_url },
    location: { key: "location", label: "Set your location", why: "We sort everything by distance from here.", href: "/profile?tab=setup", done: user.latitude != null && user.longitude != null },
  };

  if (user.active_mode === "company") {
    return [
      { key: "logo", label: "Add your company logo", why: "Applicants trust posts with a real logo.", href: "/profile?tab=setup", done: !!user.company_logo_url },
      { key: "about", label: "Describe your company", why: "Say what you do and where you are.", href: "/profile?tab=setup", done: (user.company_description ?? "").trim().length >= 30 },
      base.location,
      { key: "job", label: "Post your first job (free)", why: "Job seekers near you see it first.", href: "/jobs/post", done: c.jobs > 0 },
      { key: "verify", label: "Verify your business", why: "Verified companies get more applicants.", href: "/profile?tab=verify", done: verified || c.verificationPending },
    ];
  }

  if (user.active_mode === "artisan" || user.active_mode === "home_service_provider") {
    return [
      base.photo,
      base.location,
      { key: "bio", label: "Write a short bio", why: "Your experience, your area and your usual prices.", href: "/profile?tab=setup", done: (user.bio ?? "").trim().length >= 30 },
      { key: "skills", label: "Add your skills", why: "People search by skill.", href: "/profile?tab=setup", done: c.skills > 0 },
      { key: "work", label: "Post photos of your work", why: "Clients decide faster when they can see finished jobs.", href: "/profile?tab=posts", done: c.posts > 0 },
      { key: "verify", label: "Verify with NIN and a selfie", why: "Verified pros get a badge and rank higher.", href: "/profile?tab=verify", done: verified || c.verificationPending },
    ];
  }

  return [
    base.location,
    base.photo,
    { key: "find", label: "Find a pro near you", why: "Search by service and see who's closest.", href: "/find", done: false },
  ];
}

export function WelcomeChecklist({ user }: { user: Profile }) {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [hidden, setHidden] = useState(true);
  const [welcome, setWelcome] = useState(false);
  const storeKey = `s9_checklist_hidden_${user.id}`;

  useEffect(() => {
    setWelcome(new URLSearchParams(window.location.search).get("welcome") === "1");
    try {
      setHidden(window.localStorage.getItem(storeKey) === "1");
    } catch {
      setHidden(false);
    }
    const supabase = createClient();
    Promise.all([
      supabase.from("user_skills").select("skill_id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("jobs").select("id", { count: "exact", head: true }).eq("employer_id", user.id),
      supabase.from("verifications").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]).then(([s, p, j, v]) => {
      setCounts({ skills: s.count ?? 0, posts: p.count ?? 0, jobs: j.count ?? 0, verificationPending: (v.count ?? 0) > 0 });
    });
  }, [user.id, storeKey]);

  if (!counts) return null;
  const items = checklistFor(user, counts);
  const done = items.filter((i) => i.done).length;
  const allDone = done === items.length;
  if (allDone || (hidden && !welcome)) return null;

  const pct = Math.round((done / items.length) * 100);
  const next = items.find((i) => !i.done);

  return (
    <section aria-labelledby="checklist-title" className="mx-4 mb-4 rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="checklist-title" className="font-semibold text-text-primary text-lg">
            {welcome ? "Welcome to Skilled9ja" : "Finish your profile"}
          </h2>
          <p className="text-sm text-text-secondary">
            {done} of {items.length} done. Complete profiles show up higher near you.
          </p>
        </div>
        <button
          type="button"
          className="text-sm font-semibold text-text-secondary underline underline-offset-2 shrink-0"
          onClick={() => {
            setHidden(true);
            setWelcome(false);
            try {
              window.localStorage.setItem(storeKey, "1");
            } catch {
              /* ignore */
            }
          }}
        >
          Hide for now
        </button>
      </div>

      <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completed">
        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
      </div>

      <ol className="mt-4 space-y-1">
        {items.map((i) => (
          <li key={i.key}>
            <Link
              href={i.href}
              className={`flex items-start gap-3 rounded-xl px-2 py-2 ${i === next ? "bg-primary/5" : ""} hover:bg-gray-50`}
              aria-label={`${i.label}${i.done ? ", done" : ""}`}
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 grid place-items-center w-6 h-6 rounded-full text-xs font-bold shrink-0 ${i.done ? "bg-primary text-white" : "border-2 border-gray-300 text-transparent"}`}
              >
                ✓
              </span>
              <span>
                <span className={`block font-semibold ${i.done ? "text-text-secondary line-through" : "text-text-primary"}`}>{i.label}</span>
                {!i.done && <span className="block text-sm text-text-secondary">{i.why}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
