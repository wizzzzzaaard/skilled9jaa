"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/hooks/useSession";
import { PageLoader } from "@/components/layout/PageLoader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useUIStore } from "@/store/uiStore";
import {
  MapPin, Briefcase, Clock, ChevronLeft,
  Upload, CheckCircle, Calendar,
} from "lucide-react";

interface Job {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  job_type: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_period: string;
  state: string | null;
  city: string | null;
  application_deadline: string | null;
  requires_nin: boolean;
  requires_cv: boolean;
  requires_photo: boolean;
  requires_age_proof: boolean;
  created_at: string;
  profiles: {
    company_name: string | null;
    full_name: string;
    profile_image_url: string | null;
  } | null;
  perks: { name: string }[];
}

interface ExistingApplication {
  id: string;
  status: string;
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading } = useSession();
  const { addToast } = useUIStore();

  const [job, setJob] = useState<Job | null>(null);
  const [jobLoading, setJobLoading] = useState(true);
  const [existing, setExisting] = useState<ExistingApplication | null>(null);
  const [applying, setApplying] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Application form state
  const [coverLetter, setCoverLetter] = useState("");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [availability, setAvailability] = useState("");
  const [cvUrl, setCvUrl] = useState("");
  const [ninUrl, setNinUrl] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [ageProofUrl, setAgeProofUrl] = useState("");
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  useEffect(() => {
    fetchJob();
  }, [id]);

  useEffect(() => {
    if (user && job) checkExisting();
  }, [user?.id, job?.id]);

  async function fetchJob() {
    const supabase = createClient();
    const { data } = await supabase
      .from("jobs")
      .select(`
        id, title, description, requirements, job_type,
        salary_min, salary_max, salary_period,
        state, city, application_deadline, created_at,
        requires_nin, requires_cv, requires_photo, requires_age_proof,
        profiles(company_name, full_name, profile_image_url),
        job_perks(perks(name))
      `)
      .eq("id", id)
      .single();

 if (data) {
  setJob({
    ...data,
    profiles: Array.isArray(data.profiles) ? data.profiles[0] ?? null : data.profiles,
    perks: (data.job_perks as any[])
      .map((jp) => jp.perks)
      .filter(Boolean),
  } as Job);
}
    setJobLoading(false);
  }

  async function checkExisting() {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("job_applications")
      .select("id, status")
      .eq("job_id", id)
      .eq("applicant_id", user.id)
      .maybeSingle();
    if (data) setExisting(data);
  }

  async function uploadFile(
    file: File,
    field: "cv" | "nin" | "photo" | "age_proof"
  ) {
    if (!user) return;
    setUploadingField(field);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `applications/${user.id}/${job!.id}/${field}.${ext}`;
    const { error } = await supabase.storage
      .from("skilled-niger-assets")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (error) {
      addToast("Upload failed", "error");
      setUploadingField(null);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("skilled-niger-assets")
      .getPublicUrl(path);

    if (field === "cv") setCvUrl(publicUrl);
    if (field === "nin") setNinUrl(publicUrl);
    if (field === "photo") setPhotoUrl(publicUrl);
    if (field === "age_proof") setAgeProofUrl(publicUrl);
    setUploadingField(null);
  }

  async function handleApply() {
    if (!user || !job) return;

    if (job.requires_cv && !cvUrl) {
      addToast("Please upload your CV", "error"); return;
    }
    if (job.requires_nin && !ninUrl) {
      addToast("Please upload your NIN document", "error"); return;
    }
    if (job.requires_photo && !photoUrl) {
      addToast("Please upload your photo", "error"); return;
    }
    if (job.requires_age_proof && !ageProofUrl) {
      addToast("Please upload age proof", "error"); return;
    }
    if (!coverLetter.trim()) {
      addToast("Please write a cover letter", "error"); return;
    }
    if (!availability.trim()) {
      addToast("Please enter your availability for a call", "error"); return;
    }

    setApplying(true);
    const supabase = createClient();
    const { error } = await supabase.from("job_applications").insert({
      job_id: job.id,
      applicant_id: user.id,
      cover_letter: coverLetter,
      expected_salary: expectedSalary,
      availability,
      cv_url: cvUrl || null,
      nin_url: ninUrl || null,
      photo_url: photoUrl || null,
      age_proof_url: ageProofUrl || null,
      status: "pending",
    });

    if (error) {
      addToast("Application failed. Try again.", "error");
    } else {
      addToast("Application submitted!", "success");
      setExisting({ id: "new", status: "pending" });
      setShowForm(false);
    }
    setApplying(false);
  }

  function formatSalary(min: number | null, max: number | null, period: string) {
    if (!min && !max) return null;
    const fmt = (n: number) => `₦${n.toLocaleString()}`;
    const label = period === "monthly" ? "/month" : `/${period}`;
    if (min && max) return `${fmt(min)} – ${fmt(max)}${label}`;
    if (min) return `From ${fmt(min)}${label}`;
    return `Up to ${fmt(max!)}${label}`;
  }

  function timeAgo(date: string) {
    const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return `${Math.floor(days / 7)} weeks ago`;
  }

  if (isLoading || jobLoading) return <PageLoader />;
  if (!job) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-text-secondary">Job not found</p>
    </div>
  );

  const employer = job.profiles;
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_period);
  const deadline = job.application_deadline
    ? new Date(job.application_deadline).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })
    : null;

  function UploadField({
    label, field, url, required,
  }: {
    label: string;
    field: "cv" | "nin" | "photo" | "age_proof";
    url: string;
    required: boolean;
  }) {
    if (!required) return null;
    return (
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          {label} <span className="text-red-500">*</span>
        </label>
        <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary transition-colors">
          {url ? (
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          ) : (
            <Upload className="w-5 h-5 text-gray-400 flex-shrink-0" />
          )}
          <span className="text-sm text-text-secondary">
            {uploadingField === field
              ? "Uploading..."
              : url
              ? "Uploaded ✓ — tap to replace"
              : `Upload ${label}`}
          </span>
          <input
            type="file"
            className="hidden"
            accept={field === "photo" ? "image/*" : "*/*"}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadFile(f, field);
            }}
          />
        </label>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-32">
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-text-secondary mb-4 hover:text-text-primary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Jobs
        </button>

        {/* Job Header */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {employer?.profile_image_url ? (
                <img src={employer.profile_image_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <Briefcase className="w-6 h-6 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-text-primary leading-tight">{job.title}</h1>
              <p className="text-sm text-text-secondary mt-0.5">
                {employer?.company_name || employer?.full_name || "Company"}
              </p>
            </div>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap gap-3 mt-4">
            {job.state && (
              <span className="flex items-center gap-1.5 text-xs text-text-secondary bg-surface px-3 py-1.5 rounded-full">
                <MapPin className="w-3.5 h-3.5" />
                {job.city ? `${job.city}, ${job.state}` : job.state}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-xs text-text-secondary bg-surface px-3 py-1.5 rounded-full">
              <Briefcase className="w-3.5 h-3.5" />
              {job.job_type}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-text-secondary bg-surface px-3 py-1.5 rounded-full">
              <Clock className="w-3.5 h-3.5" />
              {timeAgo(job.created_at)}
            </span>
          </div>

          {salary && (
            <p className="mt-3 text-lg font-bold text-primary">{salary}</p>
          )}

          {deadline && (
            <div className="mt-3 flex items-center gap-2 text-xs text-orange-600 bg-orange-50 px-3 py-2 rounded-xl">
              <Calendar className="w-4 h-4" />
              Application deadline: {deadline}
            </div>
          )}

          {/* Perks */}
          {job.perks.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Benefits & Perks</p>
              <div className="flex flex-wrap gap-2">
                {job.perks.map((perk, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-full font-medium">
                    {perk.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <h2 className="font-semibold text-text-primary mb-3">Job Description</h2>
          <p className="text-sm text-text-secondary whitespace-pre-line leading-relaxed">
            {job.description || "No description provided."}
          </p>
        </div>

        {/* Requirements */}
        {job.requirements && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
            <h2 className="font-semibold text-text-primary mb-3">Requirements</h2>
            <p className="text-sm text-text-secondary whitespace-pre-line leading-relaxed">
              {job.requirements}
            </p>
          </div>
        )}

        {/* Application Section */}
        {existing ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
            <h3 className="font-semibold text-green-800">Application Submitted</h3>
            <p className="text-sm text-green-700 mt-1">
              Status: <span className="font-semibold capitalize">{existing.status.replace("_", " ")}</span>
            </p>
          </div>
        ) : !showForm ? (
          <Button
            variant="primary"
            className="w-full"
            onClick={() => setShowForm(true)}
          >
            Apply for this Job
          </Button>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <h2 className="font-semibold text-text-primary">Your Application</h2>

            {/* Required uploads */}
            <UploadField label="CV / Resume" field="cv" url={cvUrl} required={job.requires_cv} />
            <UploadField label="NIN Document" field="nin" url={ninUrl} required={job.requires_nin} />
            <UploadField label="Passport Photo" field="photo" url={photoUrl} required={job.requires_photo} />
            <UploadField label="Age Proof" field="age_proof" url={ageProofUrl} required={job.requires_age_proof} />

            {/* Cover letter */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Cover Letter <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                placeholder="Tell the employer why you're the right fit for this role..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
              />
            </div>

            {/* Expected salary */}
            <Input
              label="Expected Salary (optional)"
              placeholder="e.g. ₦150,000/month"
              value={expectedSalary}
              onChange={(e) => setExpectedSalary(e.target.value)}
            />

            {/* Availability for call */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Availability for a Call <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                placeholder="e.g. Weekdays between 10am – 2pm, or Saturday mornings"
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
              />
              <p className="text-xs text-text-secondary mt-1">
                Let the employer know when they can reach you for further discussion.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                isLoading={applying}
                onClick={handleApply}
              >
                Submit Application
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}