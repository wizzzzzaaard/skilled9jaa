"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { callAdmin } from "@/lib/admin";

type Tab = "open" | "actioned" | "dismissed" | "posts" | "hidden" | "reviews";
interface Report { id: number; created_at: string; reporter_id: string; target_type: "job" | "profile" | "post" | "review"; target_id: string; reason: string; details: string | null; status: string; resolution: string | null; resolved_at: string | null }
interface Person { id: string; full_name: string | null; company_name?: string | null; email?: string | null; account_status?: string; slug?: string | null; company_slug?: string | null }
interface Job { id: string; title: string; status: string }
interface Post { id: number; caption: string | null; user_id: string; hidden_at: string | null; hidden_reason?: string | null; created_at?: string; post_type?: string }
interface Review { id: string; client_review: string | null; client_rating: number | null; review_hidden: boolean; client_id: string; provider_id: string; rated_at?: string | null }

const REASON: Record<string, string> = { scam: "Scam / asks for money", fake: "Fake or impersonating", abuse: "Abusive or sexual", spam: "Spam", other: "Other" };
const TABS: { v: Tab; label: string }[] = [
  { v: "open", label: "Open reports" },
  { v: "actioned", label: "Actioned" },
  { v: "dismissed", label: "Dismissed" },
  { v: "posts", label: "Posts" },
  { v: "hidden", label: "Hidden posts" },
  { v: "reviews", label: "Reviews" },
];
const when = (iso: string) => new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const profileHref = (p?: Person) => (p?.company_slug ? `/company/${p.company_slug}` : p?.slug ? `/provider/${p.slug}` : null);

export default function ModerationPage() {
  const [tab, setTab] = useState<Tab>("open");
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [jobs, setJobs] = useState<Record<string, Job>>({});
  const [posts, setPosts] = useState<Post[]>([]);
  const [postMap, setPostMap] = useState<Record<string, Post>>({});
  const [reviews, setReviews] = useState<Review[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMissing(false);
    const byId = <T extends { id: string | number }>(rows: T[] | undefined) => Object.fromEntries((rows ?? []).map((r) => [String(r.id), r]));
    if (tab === "open" || tab === "actioned" || tab === "dismissed") {
      const res = await callAdmin<{ data: Report[]; profiles: Person[]; jobs: Job[]; posts: Post[]; reviews: Review[]; missing?: boolean }>("list_reports", { status: tab });
      if (!res.ok) setError(res.error);
      else {
        setMissing(!!res.data.missing);
        setReports(res.data.data ?? []);
        setPeople(byId(res.data.profiles));
        setJobs(byId(res.data.jobs));
        setPostMap(byId(res.data.posts));
        setReviews(res.data.reviews ?? []);
      }
    } else if (tab === "posts" || tab === "hidden") {
      const res = await callAdmin<{ data: Post[]; people: Person[]; missing?: boolean }>("list_posts", { hidden: tab === "hidden" });
      if (!res.ok) setError(res.error);
      else {
        setMissing(!!res.data.missing);
        setPosts(res.data.data ?? []);
        setPeople(byId(res.data.people));
      }
    } else {
      const res = await callAdmin<{ data: Review[]; people: Person[]; missing?: boolean }>("list_reviews");
      if (!res.ok) setError(res.error);
      else {
        setMissing(!!res.data.missing);
        setReviews(res.data.data ?? []);
        setPeople(byId(res.data.people));
      }
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  // One card per reported thing, with every report about it.
  const groups = useMemo(() => {
    const m = new Map<string, Report[]>();
    for (const r of reports) {
      const k = `${r.target_type}:${r.target_id}`;
      m.set(k, [...(m.get(k) ?? []), r]);
    }
    return Array.from(m.values()).sort((a, b) => b.length - a.length || b[0].created_at.localeCompare(a[0].created_at));
  }, [reports]);

  const done = (text: string) => { setNotice(text); load(); };

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-2xl font-semibold text-text-primary">Reports &amp; moderation</h1>
      <p className="text-sm text-text-secondary mt-1">Members report scam jobs, fake profiles and abusive posts here. Acting on a report closes every open report about the same thing.</p>

      <div role="tablist" aria-label="Moderation" className="mt-4 flex gap-1 overflow-x-auto rounded-lg border border-gray-200 bg-white p-1">
        {TABS.map((t) => (
          <button key={t.v} role="tab" type="button" aria-selected={tab === t.v} onClick={() => { setTab(t.v); setNotice(null); }} className={`shrink-0 px-3 py-1.5 rounded-md text-sm font-semibold ${tab === t.v ? "bg-primary text-white" : "text-text-secondary"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {notice && <p className="mt-3 text-sm font-semibold bg-white border border-gray-200 rounded-lg px-3 py-2" role="status">{notice}</p>}
      {error && <p className="mt-4 text-sm font-semibold text-red-700" role="alert">{error}</p>}
      {missing && <p className="mt-4 text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2" role="status">This needs the trust &amp; safety database update, which hasn&apos;t been applied yet.</p>}

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-text-secondary">Loading…</p>
        ) : tab === "open" || tab === "actioned" || tab === "dismissed" ? (
          groups.length === 0 ? (
            <p className="text-sm text-text-secondary bg-white rounded-xl border border-gray-100 p-6 text-center">{tab === "open" ? "No open reports. Nice." : "Nothing here yet."}</p>
          ) : (
            groups.map((g) => <ReportCard key={`${g[0].target_type}:${g[0].target_id}`} reports={g} people={people} jobs={jobs} posts={postMap} reviews={reviews} open={tab === "open"} onDone={done} />)
          )
        ) : tab === "posts" || tab === "hidden" ? (
          posts.length === 0 ? (
            <p className="text-sm text-text-secondary bg-white rounded-xl border border-gray-100 p-6 text-center">No posts.</p>
          ) : (
            posts.map((p) => <PostRow key={p.id} post={p} owner={people[p.user_id]} onDone={done} />)
          )
        ) : reviews.length === 0 ? (
          <p className="text-sm text-text-secondary bg-white rounded-xl border border-gray-100 p-6 text-center">No reviews yet. They appear after clients rate completed bookings.</p>
        ) : (
          reviews.map((r) => <ReviewRow key={r.id} review={r} people={people} onDone={done} />)
        )}
      </div>
    </div>
  );
}

function ReasonBox({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <>
      <label htmlFor={id} className="block text-sm mt-3">Note for the audit log</label>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} maxLength={300} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="e.g. Asked applicants for ₦5,000 'form fee'" />
    </>
  );
}

function ReportCard({ reports, people, jobs, posts, reviews, open, onDone }: {
  reports: Report[]; people: Record<string, Person>; jobs: Record<string, Job>; posts: Record<string, Post>; reviews: Review[]; open: boolean; onDone: (t: string) => void;
}) {
  const first = reports[0];
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  let title = "";
  let href: string | null = null;
  let extra = "";
  let actionLabel = "";
  let act: (() => Promise<{ ok: boolean; error?: string }>) | null = null;

  if (first.target_type === "job") {
    const j = jobs[first.target_id];
    title = j ? `Job: ${j.title}` : "Job (deleted)";
    href = j ? `/jobs/${j.id}` : null;
    extra = j ? `Status: ${j.status === "active" ? "live" : j.status}` : "";
    if (j && j.status !== "removed") { actionLabel = "Remove job"; act = () => callAdmin("set_job_status", { job_id: j.id, status: "removed", reason }); }
  } else if (first.target_type === "profile") {
    const p = people[first.target_id];
    title = p ? `Profile: ${p.company_name || p.full_name || "No name"}` : "Profile (deleted)";
    href = profileHref(p);
    extra = p ? `${p.email ?? ""} · ${p.account_status}` : "";
    if (p && p.account_status !== "suspended") { actionLabel = "Suspend member"; act = () => callAdmin("set_user_status", { user_id: p.id, status: "suspended", reason }); }
  } else if (first.target_type === "post") {
    const p = posts[first.target_id];
    const owner = p ? people[p.user_id] : undefined;
    title = p ? `Post: "${(p.caption || "No caption").slice(0, 80)}"` : "Post (deleted)";
    href = profileHref(owner);
    extra = p?.hidden_at ? "Already hidden" : "";
    if (p && !p.hidden_at) { actionLabel = "Hide post"; act = () => callAdmin("set_post_hidden", { id: p.id, hidden: true, reason }); }
  } else {
    const r = reviews.find((x) => x.id === first.target_id);
    title = r ? `Review: "${(r.client_review || "").slice(0, 80)}" (${r.client_rating ?? "?"}★)` : "Review (deleted)";
    if (r && !r.review_hidden) { actionLabel = "Hide review"; act = () => callAdmin("set_review_hidden", { id: r.id, hidden: true, reason }); }
  }

  async function resolve(status: "actioned" | "dismissed", withAction: boolean) {
    if (reason.trim().length < 3) return setErr("Add a short note first.");
    setBusy(true);
    setErr(null);
    if (withAction && act) {
      const a = await act();
      if (!a.ok) { setBusy(false); return setErr(a.error ?? "Couldn't do that."); }
    }
    const res = await callAdmin<{ closed: number }>("resolve_report", { id: first.id, status, reason });
    setBusy(false);
    if (!res.ok) return setErr(res.error);
    onDone(`${withAction ? actionLabel + " done" : status === "dismissed" ? "Dismissed" : "Marked as handled"}. Closed ${res.data.closed} report${res.data.closed === 1 ? "" : "s"}.`);
  }

  return (
    <article className="bg-white rounded-xl border border-gray-100 p-4" aria-label={title}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-semibold text-text-primary break-words">{href ? <Link href={href} target="_blank" className="hover:underline">{title}</Link> : title}</h2>
          {extra && <p className="text-xs text-text-secondary mt-0.5">{extra}</p>}
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold ${reports.length > 2 ? "bg-red-100 text-red-900" : "bg-amber-100 text-amber-900"}`}>
          {reports.length} report{reports.length === 1 ? "" : "s"}
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {reports.slice(0, 5).map((r) => (
          <li key={r.id} className="text-sm border-l-2 border-gray-200 pl-3">
            <span className="font-semibold">{REASON[r.reason] ?? r.reason}</span>
            <span className="text-text-secondary"> · {people[r.reporter_id]?.full_name ?? "A member"} · {when(r.created_at)}</span>
            {r.details && <p className="text-text-secondary mt-0.5 break-words">&ldquo;{r.details}&rdquo;</p>}
          </li>
        ))}
        {reports.length > 5 && <li className="text-xs text-text-secondary">and {reports.length - 5} more</li>}
      </ul>
      {open ? (
        <>
          <ReasonBox id={`r-${first.id}`} value={reason} onChange={(v) => { setReason(v); setErr(null); }} />
          {err && <p className="mt-2 text-sm font-semibold text-red-700" role="alert">{err}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {act && <button type="button" disabled={busy} onClick={() => resolve("actioned", true)} className="px-3 py-2 rounded-lg bg-red-700 text-white text-sm font-semibold disabled:opacity-50">{actionLabel}</button>}
            <button type="button" disabled={busy} onClick={() => resolve("actioned", false)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold">Handled elsewhere</button>
            <button type="button" disabled={busy} onClick={() => resolve("dismissed", false)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold">Dismiss</button>
          </div>
        </>
      ) : (
        first.resolution && <p className="mt-3 text-sm text-text-secondary">Note: {first.resolution}</p>
      )}
    </article>
  );
}

function PostRow({ post, owner, onDone }: { post: Post; owner?: Person; onDone: (t: string) => void }) {
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const hidden = !!post.hidden_at;
  async function go() {
    if (!hidden && reason.trim().length < 3) return setErr("Add a short note first.");
    const res = await callAdmin("set_post_hidden", { id: post.id, hidden: !hidden, reason });
    if (!res.ok) return setErr(res.error);
    onDone(hidden ? "Post is visible again." : "Post hidden. Its owner can still see it.");
  }
  const href = profileHref(owner);
  return (
    <article className="bg-white rounded-xl border border-gray-100 p-4">
      <p className="text-sm"><span className="font-semibold">{href ? <Link href={href} target="_blank" className="hover:underline">{owner?.company_name || owner?.full_name || "Member"}</Link> : owner?.full_name || "Member"}</span>
        <span className="text-text-secondary"> · {post.post_type === "video" ? "Video" : "Photos"}{post.created_at ? ` · ${when(post.created_at)}` : ""}</span></p>
      <p className="text-sm mt-1 break-words">{post.caption || <span className="text-text-secondary">No caption</span>}</p>
      {hidden && <p className="text-xs text-red-800 mt-1">Hidden: {post.hidden_reason}</p>}
      {!hidden && <ReasonBox id={`p-${post.id}`} value={reason} onChange={(v) => { setReason(v); setErr(null); }} />}
      {err && <p className="mt-2 text-sm font-semibold text-red-700" role="alert">{err}</p>}
      <button type="button" onClick={go} className={`mt-3 px-3 py-2 rounded-lg text-sm font-semibold ${hidden ? "border border-gray-200" : "bg-red-700 text-white"}`}>{hidden ? "Show again" : "Hide post"}</button>
    </article>
  );
}

function ReviewRow({ review, people, onDone }: { review: Review; people: Record<string, Person>; onDone: (t: string) => void }) {
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  async function go() {
    if (!review.review_hidden && reason.trim().length < 3) return setErr("Add a short note first.");
    const res = await callAdmin("set_review_hidden", { id: review.id, hidden: !review.review_hidden, reason });
    if (!res.ok) return setErr(res.error);
    onDone(review.review_hidden ? "Review is visible again." : "Review hidden.");
  }
  return (
    <article className="bg-white rounded-xl border border-gray-100 p-4">
      <p className="text-sm"><span className="font-semibold">{people[review.client_id]?.full_name ?? "Client"}</span> rated <span className="font-semibold">{people[review.provider_id]?.full_name ?? "provider"}</span> {review.client_rating ?? "?"}★</p>
      <p className="text-sm mt-1 break-words">&ldquo;{review.client_review}&rdquo;</p>
      {!review.review_hidden && <ReasonBox id={`v-${review.id}`} value={reason} onChange={(v) => { setReason(v); setErr(null); }} />}
      {err && <p className="mt-2 text-sm font-semibold text-red-700" role="alert">{err}</p>}
      <button type="button" onClick={go} className={`mt-3 px-3 py-2 rounded-lg text-sm font-semibold ${review.review_hidden ? "border border-gray-200" : "bg-red-700 text-white"}`}>{review.review_hidden ? "Show again" : "Hide review"}</button>
    </article>
  );
}
