"use client";
import { useState, useEffect } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Briefcase, Clock, CheckCircle, XCircle, Eye } from "lucide-react";

interface Application {
  id: string;
  status: string;
  cover_letter: string | null;
  expected_salary: string | null;
  availability: string | null;
  applied_at: string;
  jobs: {
    id: string;
    title: string;
    job_type: string;
    state: string | null;
    salary_min: number | null;
    salary_max: number | null;
    profiles: {
      company_name: string | null;
      full_name: string;
    } | null;
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: "Under Review",
    color: "bg-yellow-50 text-yellow-700 border-yellow-200",
    icon: <Clock className="w-3 h-3" />,
  },
  reviewed: {
    label: "Reviewed",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: <Eye className="w-3 h-3" />,
  },
  approved: {
    label: "Approved",
    color: "bg-green-50 text-green-700 border-green-200",
    icon: <CheckCircle className="w-3 h-3" />,
  },
  rejected: {
    label: "Not Selected",
    color: "bg-red-50 text-red-700 border-red-200",
    icon: <XCircle className="w-3 h-3" />,
  },
};

export function ApplicationsTab() {
  const { user } = useSessionStore();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchApplications();
  }, [user?.id]);

  async function fetchApplications() {
    const supabase = createClient();
    const { data } = await supabase
      .from("job_applications")
      .select(`
        id, status, cover_letter, expected_salary, availability, applied_at,
        jobs(
          id, title, job_type, state, salary_min, salary_max,
          profiles(company_name, full_name)
        )
      `)
      .eq("applicant_id", user!.id)
      .order("applied_at", { ascending: false });

    if (data) setApplications(data as unknown as Application[]);
    setLoading(false);
  }

  function formatSalary(min: number | null, max: number | null) {
    if (!min && !max) return null;
    const fmt = (n: number) => `₦${(n / 1000).toFixed(0)}k`;
    if (min && max) return `${fmt(min)} – ${fmt(max)}`;
    if (min) return `From ${fmt(min)}`;
    return `Up to ${fmt(max!)}`;
  }

  function timeAgo(date: string) {
    const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-12">
        <Briefcase className="w-12 h-12 text-gray-200 mx-auto mb-3" />
        <h3 className="font-semibold text-text-primary mb-1">No applications yet</h3>
        <p className="text-sm text-text-secondary mb-4">
          Browse available jobs and start applying
        </p>
        <button
          onClick={() => router.push("/jobs")}
          className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold"
        >
          Browse Jobs
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-text-primary">My Applications</h3>
        <span className="text-xs text-text-secondary">{applications.length} total</span>
      </div>

      {applications.map((app) => {
        const job = app.jobs;
        if (!job) return null;
        const statusConfig = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending;
        const company = job.profiles?.company_name || job.profiles?.full_name || "Company";
        const salary = formatSalary(job.salary_min, job.salary_max);

        return (
          <button
            key={app.id}
            onClick={() => router.push(`/jobs/${job.id}`)}
            className="w-full bg-surface rounded-xl p-4 text-left hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-text-primary text-sm leading-tight truncate">
                  {job.title}
                </h4>
                <p className="text-xs text-text-secondary mt-0.5 truncate">{company}</p>

                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {job.state && (
                    <span className="text-xs text-text-secondary">{job.state}</span>
                  )}
                  <span className="text-xs text-text-secondary">·</span>
                  <span className="text-xs text-text-secondary">{job.job_type}</span>
                  {salary && (
                    <>
                      <span className="text-xs text-text-secondary">·</span>
                      <span className="text-xs font-semibold text-primary">{salary}/mo</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${statusConfig.color}`}>
                  {statusConfig.icon}
                  {statusConfig.label}
                </span>
                <span className="text-[10px] text-text-secondary">
                  Applied {timeAgo(app.applied_at)}
                </span>
              </div>
            </div>

            {/* Show HR contact if approved */}
            {app.status === "approved" && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                <p className="text-xs font-semibold text-green-800 mb-1">
                  🎉 Congratulations! You've been approved.
                </p>
                <p className="text-xs text-green-700">
                  Check your email for contact details from the employer.
                </p>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}