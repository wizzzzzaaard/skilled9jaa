"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { callAdmin } from "@/lib/admin";
import { formatPay } from "@/lib/jobs";

interface Job {
  id: string;
  title: string;
  state: string | null;
  city: string | null;
  status: string;
  job_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  applications_count: number | null;
  created_at: string;
  employer_id: string;
}
interface Employer { id: string; company_name: string | null; full_name: string | null; email: string | null }

const TABS = [
  { v: "active", label: "Live" },
  { v: "closed", label: "Closed" },
  { v: "removed", label: "Removed" },
  { v: "", label: "All" },
];
const BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-900",
  closed: "bg-gray-100 text-gray-800",
  removed: "bg-red-100 text-red-900",
};

export default function AdminJobsPage() {
  const [status, setStatus] = useState("active");
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [offset, setOffset] = useState(0);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [employers, setEmployers] = useState<Record<string, Employer>>({});
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [acting, setActing] = useState<{ job: Job; to: string } | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await callAdmin<{ data: Job[]; count: number; employers: Employer[] }>("list_jobs", { status, q: term, offset });
    if (!res.ok) setError(res.error);
    else {
      setJobs(res.data.data ?? []);
      setCount(res.data.count ?? 0);
      setEmployers(Object.fromEntries((res.data.employers ?? []).map((e) => [e.id, e])));
    }
    setLoading(false);
  }, [status, term, offset]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = window.setTimeout(() => { setTerm(q.trim()); setOffset(0); }, 350);
    return () => window.clearTimeout(t);
  }, [q]);

  async function confirm() {
    if (!acting) return;
    const res = await callAdmin("set_job_status", { job_id: acting.job.id, status: acting.to, reason });
    if (!res.ok) return setNotice(res.error);
    setNotice(`"${acting.job.title}" is now ${acting.to === "active" ? "live" : acting.to}.`);
    setActing(null);
    setReason("");
    load();
  }

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-2xl font-semibold text-text-primary">Jobs</h1>
      <p className="text-sm text-text-secondary mt-1">Take down scams and duplicates, or reopen a job closed by mistake. Every change is logged.</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Job status" className="flex rounded-lg border border-gray-200 bg-white p-1">
          {TABS.map((t) => (
            <button
              key={t.v}
              role="tab"
              aria-selected={status === t.v}
              type="button"
              onClick={() => { setStatus(t.v); setOffset(0); }}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold ${status === t.v ? "bg-primary text-white" : "text-text-secondary"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label htmlFor="j-q" className="sr-only">Search job titles</label>
        <input id="j-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search job titles" className="flex-1 min-w-[200px] rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white" />
      </div>

      {notice && <p className="mt-3 text-sm font-semibold bg-white border border-gray-200 rounded-lg px-3 py-2" role="status">{notice}</p>}
      {error && <p className="mt-4 text-sm font-semibold text-red-700" role="alert">{error}</p>}

      {acting && (
        <div className="mt-4 p-4 rounded-xl border border-gray-200 bg-white">
          <p className="font-semibold">
            {acting.to === "removed" ? `Remove "${acting.job.title}"? It disappears from the jobs board.` : acting.to === "closed" ? `Close "${acting.job.title}"?` : `Make "${acting.job.title}" live again?`}
          </p>
          <label htmlFor="j-reason" className="block text-sm mt-2">Reason (saved in the audit log)</label>
          <input id="j-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={confirm} disabled={acting.to === "removed" && reason.trim().length < 3} className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50">Confirm</button>
            <button type="button" onClick={() => setActing(null)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold">Cancel</button>
          </div>
          {acting.to === "removed" && reason.trim().length < 3 && <p className="text-xs text-text-secondary mt-1">A reason is required to remove a job.</p>}
        </div>
      )}

      <div className={`mt-4 bg-white rounded-xl border border-gray-100 overflow-x-auto transition-opacity ${loading && jobs.length ? "opacity-60" : ""}`} aria-busy={loading}>
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-100 text-left text-xs text-text-secondary">
            <tr>
              <th className="px-3 py-3 font-semibold">Job</th>
              <th className="px-3 py-3 font-semibold">Employer</th>
              <th className="px-3 py-3 font-semibold">Pay</th>
              <th className="px-3 py-3 font-semibold">Applicants</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-3 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && jobs.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-text-secondary">Loading…</td></tr>
            ) : jobs.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-text-secondary">{error ? "–" : "No jobs here."}</td></tr>
            ) : (
              jobs.map((j) => {
                const e = employers[j.employer_id];
                return (
                  <tr key={j.id}>
                    <td className="px-3 py-3">
                      {j.status === "active" ? (
                        <Link href={`/jobs/${j.id}`} target="_blank" className="font-semibold text-text-primary hover:underline">{j.title}</Link>
                      ) : (
                        <span className="font-semibold text-text-primary">{j.title}</span>
                      )}
                      <span className="block text-xs text-text-secondary">
                        {[j.job_type, [j.city, j.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ")} · {new Date(j.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-text-secondary">
                      {e?.company_name || e?.full_name || "Unknown"}
                      {e?.email && <span className="block text-xs">{e.email}</span>}
                    </td>
                    <td className="px-3 py-3 text-text-secondary">{formatPay(j.salary_min, j.salary_max, "monthly") || "–"}</td>
                    <td className="px-3 py-3">{j.applications_count ?? 0}</td>
                    <td className="px-3 py-3"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${BADGE[j.status] ?? "bg-gray-100"}`}>{j.status === "active" ? "Live" : j.status}</span></td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {j.status !== "active" && <button type="button" onClick={() => setActing({ job: j, to: "active" })} className="px-2.5 py-1 rounded-md border border-gray-200 text-xs font-semibold">Make live</button>}
                        {j.status === "active" && <button type="button" onClick={() => setActing({ job: j, to: "closed" })} className="px-2.5 py-1 rounded-md border border-gray-200 text-xs font-semibold">Close</button>}
                        {j.status !== "removed" && <button type="button" onClick={() => setActing({ job: j, to: "removed" })} className="px-2.5 py-1 rounded-md border border-red-200 text-red-800 text-xs font-semibold">Remove</button>}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {count > 50 && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <button type="button" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - 50))} className="px-3 py-2 rounded-lg border border-gray-200 bg-white font-semibold disabled:opacity-40">Previous</button>
          <span className="text-text-secondary">{offset + 1}–{Math.min(offset + 50, count)} of {count}</span>
          <button type="button" disabled={offset + 50 >= count} onClick={() => setOffset((o) => o + 50)} className="px-3 py-2 rounded-lg border border-gray-200 bg-white font-semibold disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
