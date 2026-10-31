"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Briefcase, Clock, Search, SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { JOB_TYPES, NIGERIAN_STATES } from "@/lib/nigeria";
import {
  EMPTY_FILTERS,
  activeFilterCount,
  filtersFromSearch,
  filtersToSearch,
  formatPay,
  isClosed,
  loadEmployers,
  postedAgo,
  type Employer,
  type JobFilters,
} from "@/lib/jobs";

interface Job {
  id: string;
  title: string;
  state: string | null;
  city: string | null;
  job_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_period: string | null;
  application_deadline: string | null;
  created_at: string;
  employer_id: string;
  job_perks?: { perks: { name: string } | null }[];
}
interface Perk {
  id: string;
  name: string;
}

const PAGE = 20;
const PAY_STEPS = [50000, 100000, 150000, 250000, 400000];

export default function JobsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<JobFilters>(EMPTY_FILTERS);
  const [draftQ, setDraftQ] = useState("");
  const [ready, setReady] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [employers, setEmployers] = useState<Record<string, Employer>>({});
  const [total, setTotal] = useState<number | null>(null);
  const [perks, setPerks] = useState<Perk[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const request = useRef(0);

  // Read filters from the link once, then keep the link in step with the filters.
  useEffect(() => {
    const f = filtersFromSearch(window.location.search);
    setFilters(f);
    setDraftQ(f.q);
    setReady(true);
    createClient()
      .from("perks")
      .select("id, name")
      .order("name")
      .then(({ data }: { data: Perk[] | null }) => data && setPerks(data));
  }, []);

  const fetchPage = useCallback(
    async (f: JobFilters, offset: number) => {
      const id = ++request.current;
      offset ? setLoadingMore(true) : setLoading(true);
      setError(null);
      const supabase = createClient();
      // Perk filter: jobs that have any of the chosen perks.
      const perkJoin = f.perks.length ? ", job_perks!inner(perk_id, perks(name))" : ", job_perks(perks(name))";
      let q = supabase
        .from("jobs")
        .select(`id, title, state, city, job_type, salary_min, salary_max, salary_period, application_deadline, created_at, employer_id${perkJoin}`, { count: "exact" })
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE - 1);
      if (f.q) q = q.ilike("title", `%${f.q.replace(/[%_,()]/g, " ")}%`);
      if (f.state) q = q.eq("state", f.state);
      if (f.type) q = q.eq("job_type", f.type);
      // A job matches if its top pay reaches what the person asked for.
      if (f.minPay) q = q.gte("salary_max", f.minPay);
      if (f.perks.length) q = q.in("job_perks.perk_id", f.perks);

      const { data, count, error: err } = await q;
      if (id !== request.current) return; // a newer search replaced this one
      if (err) {
        setError("Couldn't load jobs. Check your connection and try again.");
      } else {
        const rows = (data ?? []) as unknown as Job[];
        setJobs((prev) => (offset ? [...prev, ...rows] : rows));
        setTotal(count ?? null);
        const emp = await loadEmployers(supabase, rows.map((r) => r.employer_id));
        setEmployers((prev) => ({ ...prev, ...emp }));
      }
      setLoading(false);
      setLoadingMore(false);
    },
    [],
  );

  useEffect(() => {
    if (!ready) return;
    fetchPage(filters, 0);
    const next = `/jobs${filtersToSearch(filters)}`;
    if (next !== window.location.pathname + window.location.search) router.replace(next, { scroll: false });
  }, [filters, ready, fetchPage, router]);

  // Search as you type, after a short pause.
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => setFilters((f) => (f.q === draftQ.trim() ? f : { ...f, q: draftQ.trim() })), 400);
    return () => window.clearTimeout(t);
  }, [draftQ, ready]);

  const set = (patch: Partial<JobFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const togglePerk = (pid: string) => set({ perks: filters.perks.includes(pid) ? filters.perks.filter((x) => x !== pid) : [...filters.perks, pid] });
  const count = activeFilterCount(filters);
  const selectCls = "w-full rounded-xl border border-gray-200 px-3 py-3 text-base sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="min-h-screen bg-surface pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-end justify-between gap-3 mb-4">
          <h1 className="text-2xl font-bold text-text-primary">Jobs</h1>
          <Link href="/jobs/post" className="text-sm font-semibold text-primary underline underline-offset-2">
            Post a job
          </Link>
        </div>

        <label htmlFor="job-q" className="sr-only">Search jobs</label>
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            id="job-q"
            type="search"
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder="Search job titles, for example cashier"
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-3 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            aria-controls="job-filters"
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-text-primary"
          >
            <SlidersHorizontal className="w-4 h-4" aria-hidden="true" /> Filters{count ? ` (${count})` : ""}
          </button>
          {count > 0 && (
            <button type="button" onClick={() => { setFilters(EMPTY_FILTERS); setDraftQ(""); }} className="text-sm font-semibold text-text-secondary underline underline-offset-2">
              Clear all
            </button>
          )}
        </div>

        {showFilters && (
          <div id="job-filters" className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="f-state" className="block text-sm font-semibold mb-1">State</label>
                <select id="f-state" className={selectCls} value={filters.state} onChange={(e) => set({ state: e.target.value })}>
                  <option value="">All states</option>
                  {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="f-type" className="block text-sm font-semibold mb-1">Job type</label>
                <select id="f-type" className={selectCls} value={filters.type} onChange={(e) => set({ type: e.target.value })}>
                  <option value="">All types</option>
                  {JOB_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="f-pay" className="block text-sm font-semibold mb-1">Pays at least (monthly)</label>
              <select id="f-pay" className={selectCls} value={filters.minPay ?? ""} onChange={(e) => set({ minPay: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Any pay</option>
                {PAY_STEPS.map((p) => <option key={p} value={p}>₦{p.toLocaleString("en-NG")}</option>)}
              </select>
            </div>
            {perks.length > 0 && (
              <fieldset>
                <legend className="text-sm font-semibold mb-2">Has any of these perks</legend>
                <div className="flex flex-wrap gap-2">
                  {perks.map((p) => {
                    const on = filters.perks.includes(p.id);
                    return (
                      <button key={p.id} type="button" aria-pressed={on} onClick={() => togglePerk(p.id)} className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${on ? "bg-primary text-white border-primary" : "bg-white border-gray-200 text-text-primary"}`}>
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}
          </div>
        )}

        <p className="text-sm text-text-secondary mb-3" aria-live="polite">
          {loading ? "Searching…" : total !== null ? `${total.toLocaleString("en-NG")} open job${total === 1 ? "" : "s"}${count ? " match" : ""}` : ""}
        </p>

        {error ? (
          <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
            <p className="text-text-primary font-semibold mb-3" role="alert">{error}</p>
            <button type="button" onClick={() => fetchPage(filters, 0)} className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold">Try again</button>
          </div>
        ) : loading ? (
          <div className="space-y-3" aria-hidden="true">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-white rounded-xl border border-gray-100 animate-pulse" />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-14 bg-white rounded-2xl border border-gray-100">
            <Briefcase className="w-12 h-12 mx-auto mb-3 text-gray-200" aria-hidden="true" />
            <p className="font-semibold text-text-primary">No jobs match these filters</p>
            {count > 0 && (
              <button type="button" onClick={() => { setFilters(EMPTY_FILTERS); setDraftQ(""); }} className="mt-3 text-sm font-semibold text-primary underline underline-offset-2">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {jobs.map((job) => {
              const emp = employers[job.employer_id];
              const pay = formatPay(job.salary_min, job.salary_max, job.salary_period ?? "monthly");
              const perkNames = (job.job_perks ?? []).map((jp) => jp.perks?.name).filter(Boolean) as string[];
              return (
                <li key={job.id}>
                  <Link href={`/jobs/${job.id}`} className="block bg-white rounded-xl border border-gray-100 p-4 hover:border-primary/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {emp?.logo_url ? <img src={emp.logo_url} className="w-full h-full object-cover" alt="" /> : <Briefcase className="w-5 h-5 text-primary" aria-hidden="true" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="font-semibold text-text-primary leading-tight">{job.title}</h2>
                        {emp?.name && <p className="text-sm text-text-secondary mt-0.5">{emp.name}</p>}
                        {pay && <p className="text-sm font-bold text-primary mt-1">{pay}</p>}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-text-secondary">
                          {(job.city || job.state) && (
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" aria-hidden="true" />{[job.city, job.state].filter(Boolean).join(", ")}</span>
                          )}
                          {job.job_type && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" aria-hidden="true" />{job.job_type}</span>}
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" aria-hidden="true" />{postedAgo(job.created_at)}</span>
                          {isClosed(job.application_deadline) && <span className="font-semibold text-orange-700">Closed</span>}
                        </div>
                        {perkNames.length > 0 && (
                          <p className="mt-2 flex flex-wrap gap-1.5">
                            {perkNames.slice(0, 4).map((n) => (
                              <span key={n} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{n}</span>
                            ))}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {!loading && !error && total !== null && jobs.length < total && (
          <button type="button" onClick={() => fetchPage(filters, jobs.length)} disabled={loadingMore} className="mt-4 w-full py-3 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-text-primary disabled:opacity-60">
            {loadingMore ? "Loading…" : `Show more jobs (${(total - jobs.length).toLocaleString("en-NG")} left)`}
          </button>
        )}
      </div>
    </div>
  );
}
