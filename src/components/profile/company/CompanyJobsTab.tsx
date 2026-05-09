"use client";
import { useState, useEffect } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { createClient } from "@/lib/supabase/client";
import { useUIStore } from "@/store/uiStore";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, MapPin, Briefcase, Eye, CheckCircle, XCircle,} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface Application {
  id: string;
  status: string;
  cover_letter: string | null;
  expected_salary: string | null;
  availability: string | null;
  applied_at: string;
  cv_url: string | null;
  nin_url: string | null;
  photo_url: string | null;
  profiles: {
    full_name: string;
    email: string;
    phone_number: string | null;
    profile_image_url: string | null;
  } | null;
}

interface Job {
  id: string;
  title: string;
  job_type: string;
  state: string | null;
  city: string | null;
  status: string;
  created_at: string;
  applications_count: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-yellow-50 text-yellow-700" },
  reviewed: { label: "Reviewed", color: "bg-blue-50 text-blue-700" },
  approved: { label: "Approved", color: "bg-green-50 text-green-700" },
  rejected: { label: "Rejected", color: "bg-red-50 text-red-700" },
};

export function CompanyJobsTab() {
  const { user } = useSessionStore();
  const { addToast } = useUIStore();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [applications, setApplications] = useState<Record<string, Application[]>>({});
  const [loadingApps, setLoadingApps] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Approval modal state
  const [approvalModal, setApprovalModal] = useState<{ appId: string; jobId: string } | null>(null);
  const [hrContact, setHrContact] = useState("");
  const [hrNote, setHrNote] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchJobs();
  }, [user?.id]);

  async function fetchJobs() {
    const supabase = createClient();
    const { data } = await supabase
      .from("jobs")
      .select("id, title, job_type, state, city, status, created_at, applications_count")
      .eq("employer_id", user!.id)
      .order("created_at", { ascending: false });

    if (data) setJobs(data);
    setLoading(false);
  }

  async function fetchApplications(jobId: string) {
    if (applications[jobId]) return;
    setLoadingApps(jobId);
    const supabase = createClient();
    const { data } = await supabase
      .from("job_applications")
      .select("id, status, cover_letter, expected_salary, availability, applied_at, cv_url, nin_url, photo_url, profiles(full_name, email, phone_number, profile_image_url)")
      .eq("job_id", jobId)
      .order("applied_at", { ascending: false });

    if (data) setApplications((prev) => ({ ...prev, [jobId]: data as unknown as Application[] }));
    setLoadingApps(null);
  }

  async function toggleJob(jobId: string) {
    if (expandedJob === jobId) {
      setExpandedJob(null);
    } else {
      setExpandedJob(jobId);
      await fetchApplications(jobId);
    }
  }

  async function updateStatus(appId: string, jobId: string, status: string) {
    if (status === "approved") {
      setApprovalModal({ appId, jobId });
      return;
    }
    const supabase = createClient();
    await supabase.from("job_applications").update({ status }).eq("id", appId);
    setApplications((prev) => ({
      ...prev,
      [jobId]: prev[jobId].map((a) => a.id === appId ? { ...a, status } : a),
    }));
    addToast("Status updated", "success");
  }

  async function confirmApproval() {
    if (!approvalModal) return;
    if (!hrContact.trim() || !hrNote.trim()) {
      addToast("HR contact and note are required", "error");
      return;
    }
    setApprovingId(approvalModal.appId);
    const supabase = createClient();
    await supabase.from("job_applications").update({
      status: "approved",
      availability: `HR Contact: ${hrContact}\n\nNote: ${hrNote}`,
    }).eq("id", approvalModal.appId);

    setApplications((prev) => ({
      ...prev,
      [approvalModal.jobId]: prev[approvalModal.jobId].map((a) =>
        a.id === approvalModal.appId ? { ...a, status: "approved" } : a
      ),
    }));

    addToast("Application approved", "success");
    setApprovalModal(null);
    setHrContact("");
    setHrNote("");
    setApprovingId(null);
  }

  function timeAgo(date: string) {
    const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Approval Modal */}
      {approvalModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-text-primary">Approve Application</h3>
            <p className="text-sm text-text-secondary">
              Before approving, provide the applicant with contact details and a note.
            </p>
            <Input
              label="HR Contact (name + phone/email) *"
              placeholder="e.g. Amaka - 08012345678"
              value={hrContact}
              onChange={(e) => setHrContact(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Note for Applicant *
              </label>
              <textarea
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                placeholder="e.g. Please call between 9am-5pm weekdays. Bring your documents to the interview."
                value={hrNote}
                onChange={(e) => setHrNote(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setApprovalModal(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                isLoading={!!approvingId}
                onClick={confirmApproval}
              >
                Confirm Approval
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-text-primary">Posted Jobs</h3>
        <button
          onClick={() => router.push("/jobs/post")}
          className="text-xs text-primary font-semibold"
        >
          + Post Job
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-10">
          <Briefcase className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-text-primary mb-1">No jobs posted yet</p>
          <p className="text-sm text-text-secondary mb-4">Post your first job to start receiving applications</p>
          <button
            onClick={() => router.push("/jobs/post")}
            className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold"
          >
            Post a Job
          </button>
        </div>
      ) : (
        jobs.map((job) => (
          <div key={job.id} className="border border-gray-100 rounded-xl overflow-hidden">
            {/* Job header */}
            <button
              onClick={() => toggleJob(job.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-text-primary text-sm">{job.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {(job.city || job.state) && (
                    <span className="flex items-center gap-1 text-xs text-text-secondary">
                      <MapPin className="w-3 h-3" />
                      {[job.city, job.state].filter(Boolean).join(", ")}
                    </span>
                  )}
                  <span className="text-xs text-text-secondary">{job.job_type}</span>
                  <span className="text-xs text-text-secondary">{timeAgo(job.created_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                <span className="text-xs bg-surface px-2 py-1 rounded-full text-text-secondary">
                  {job.applications_count || 0} applicants
                </span>
                {expandedJob === job.id
                  ? <ChevronUp className="w-4 h-4 text-text-secondary" />
                  : <ChevronDown className="w-4 h-4 text-text-secondary" />
                }
              </div>
            </button>

            {/* Applications list */}
            {expandedJob === job.id && (
              <div className="border-t border-gray-100 divide-y divide-gray-50">
                {loadingApps === job.id ? (
                  <div className="p-4 text-center text-sm text-text-secondary">Loading...</div>
                ) : !applications[job.id] || applications[job.id].length === 0 ? (
                  <div className="p-4 text-center text-sm text-text-secondary">No applications yet</div>
                ) : (
                  applications[job.id].map((app) => {
                    const statusCfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending;
                    return (
                      <div key={app.id} className="p-4 space-y-3">
                        {/* Applicant info */}
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {app.profiles?.profile_image_url ? (
                              <img src={app.profiles.profile_image_url} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <span className="text-sm font-bold text-primary">
                                {app.profiles?.full_name?.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-text-primary text-sm">
                              {app.profiles?.full_name || "Unknown"}
                            </p>
                            <p className="text-xs text-text-secondary">{app.profiles?.email}</p>
                            {app.profiles?.phone_number && (
                              <p className="text-xs text-text-secondary">{app.profiles.phone_number}</p>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </div>

                        {/* Application details */}
                        {app.cover_letter && (
                          <div className="bg-surface rounded-lg p-3">
                            <p className="text-xs font-semibold text-text-secondary mb-1">Cover Letter</p>
                            <p className="text-xs text-text-primary leading-relaxed line-clamp-3">
                              {app.cover_letter}
                            </p>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
                          {app.expected_salary && (
                            <span className="bg-surface px-2 py-1 rounded">
                              Expected: {app.expected_salary}
                            </span>
                          )}
                          {app.availability && (
                            <span className="bg-surface px-2 py-1 rounded">
                              Available: {app.availability}
                            </span>
                          )}
                        </div>

                        {/* Document links */}
                        <div className="flex gap-2 flex-wrap">
                          {app.cv_url && (
                            <a href={app.cv_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-primary underline">
                              View CV
                            </a>
                          )}
                          {app.nin_url && (
                            <a href={app.nin_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-primary underline">
                              View NIN
                            </a>
                          )}
                          {app.photo_url && (
                            <a href={app.photo_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-primary underline">
                              View Photo
                            </a>
                          )}
                        </div>

                        {/* Action buttons */}
                        {app.status !== "approved" && app.status !== "rejected" && (
                          <div className="flex gap-2">
                            {app.status === "pending" && (
                              <button
                                onClick={() => updateStatus(app.id, job.id, "reviewed")}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg font-medium"
                              >
                                <Eye className="w-3 h-3" /> Mark Reviewed
                              </button>
                            )}
                            <button
                              onClick={() => updateStatus(app.id, job.id, "approved")}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-50 text-green-700 rounded-lg font-medium"
                            >
                              <CheckCircle className="w-3 h-3" /> Approve
                            </button>
                            <button
                              onClick={() => updateStatus(app.id, job.id, "rejected")}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-50 text-red-700 rounded-lg font-medium"
                            >
                              <XCircle className="w-3 h-3" /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}