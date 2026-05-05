"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/hooks/useSession";
import { PageLoader } from "@/components/layout/PageLoader";
import { useRouter } from "next/navigation";
import { MapPin, Briefcase, Clock } from "lucide-react";

const STATES = ["All States","Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"];
const JOB_TYPES = ["All Types", "Full-time", "Part-time", "Contract", "Freelance", "Internship"];

interface Job {
  id: string;
  title: string;
  state: string | null;
  job_type: string;
  salary_min: number | null;
  salary_max: number | null;
  created_at: string;
  profiles: { company_name: string | null; full_name: string; profile_image_url: string | null } | null;
}

interface Perk { id: string; name: string; }

export default function JobsPage() {
  const { isLoading } = useSession();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [perks, setPerks] = useState<Perk[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [stateFilter, setStateFilter] = useState("All States");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [selectedPerks, setSelectedPerks] = useState<string[]>([]);

  useEffect(() => {
    fetchPerks();
    fetchJobs();
  }, []);

  async function fetchPerks() {
    const supabase = createClient();
    const { data } = await supabase.from("perks").select("id, name").order("name");
    if (data) setPerks(data);
  }

  async function fetchJobs() {
    setJobsLoading(true);
    const supabase = createClient();
    let query = supabase
      .from("jobs")
      .select("id, title, state, job_type, salary_min, salary_max, created_at, profiles(company_name, full_name, profile_image_url)")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (stateFilter !== "All States") query = query.eq("state", stateFilter);
    if (typeFilter !== "All Types") query = query.eq("job_type", typeFilter);
    if (salaryMin) query = query.gte("salary_min", Number(salaryMin));
    if (salaryMax) query = query.lte("salary_max", Number(salaryMax));

    const { data } = await query.limit(50);
    if (data) setJobs(data as unknown as Job[]);
    setJobsLoading(false);
  }

  function togglePerk(id: string) {
    setSelectedPerks((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);
  }

  function formatSalary(min: number | null, max: number | null) {
    if (!min && !max) return null;
    const fmt = (n: number) => `₦${(n / 1000).toFixed(0)}k`;
    if (min && max) return `${fmt(min)} - ${fmt(max)}`;
    if (min) return `From ${fmt(min)}`;
    return `Up to ${fmt(max!)}`;
  }

  function timeAgo(date: string) {
    const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}d ago`;
  }

  if (isLoading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-surface pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-text-primary mb-4">Jobs</h1>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-text-secondary mb-4 w-full justify-between"
        >
          <span className="flex items-center gap-2">⚙️ Filter Jobs</span>
          <span>{showFilters ? "▲" : "▼"}</span>
        </button>

        {showFilters && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Location</label>
              <select className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
                {STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Job Type</label>
              <select className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                {JOB_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Monthly Salary (₦)</label>
              <div className="grid grid-cols-2 gap-2">
                <input className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm" placeholder="Min" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} />
                <input className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm" placeholder="Max" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-2">Benefits & Perks</label>
              <div className="grid grid-cols-2 gap-2">
                {perks.map((perk) => (
                  <label key={perk.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPerks.includes(perk.id)}
                      onChange={() => togglePerk(perk.id)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm text-text-primary">{perk.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <button
              onClick={fetchJobs}
              className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-semibold"
            >
              Apply Filters
            </button>
          </div>
        )}

        {/* Jobs List */}
        {jobsLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-white rounded-xl border border-gray-100 animate-pulse" />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 text-text-secondary">
            <Briefcase className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p>No jobs match your filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <button
                key={job.id}
                onClick={() => router.push(`/jobs/${job.id}`)}
                className="w-full bg-white rounded-xl border border-gray-100 p-4 text-left hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {job.profiles?.profile_image_url ? (
                      <img src={job.profiles.profile_image_url} className="w-10 h-10 rounded-xl object-cover" alt="" />
                    ) : (
                      <Briefcase className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text-primary text-sm leading-tight">{job.title}</h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {job.profiles?.company_name || job.profiles?.full_name || "Company"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {job.state && (
                        <span className="flex items-center gap-1 text-xs text-text-secondary">
                          <MapPin className="w-3 h-3" />{job.state}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-text-secondary">
                        <Briefcase className="w-3 h-3" />{job.job_type}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-text-secondary">
                        <Clock className="w-3 h-3" />{timeAgo(job.created_at)}
                      </span>
                    </div>
                    {formatSalary(job.salary_min, job.salary_max) && (
                      <p className="text-xs font-semibold text-primary mt-1">
                        {formatSalary(job.salary_min, job.salary_max)}/month
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}