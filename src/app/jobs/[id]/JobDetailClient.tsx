"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { MapPin, Briefcase, Clock, ChevronLeft, Upload, CheckCircle, Calendar, Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/hooks/useSession";
import { Button } from "@/components/ui/Button";
import { formatPay, isClosed, loadEmployers, postedAgo, shareText, type Employer } from "@/lib/jobs";
import { checkDocument, uploadApplicationDocument } from "@/lib/documents";

interface Job {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  job_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_period: string | null;
  state: string | null;
  city: string | null;
  location: string | null;
  application_deadline: string | null;
  requires_nin: boolean;
  requires_cv: boolean;
  requires_photo: boolean;
  requires_age_proof: boolean;
  created_at: string;
  employer_id: string;
  perks: string[];
}

type DocField = "cv" | "nin" | "photo" | "age_proof";
const DOC_LABEL: Record<DocField, string> = { cv: "CV", nin: "NIN slip or card", photo: "Recent photo", age_proof: "Proof of age" };

const STATUS_TEXT: Record<string, string> = {
  pending: "Sent. The employer hasn't opened it yet.",
  reviewed: "The employer has looked at your application.",
  accepted: "Accepted. The employer will contact you.",
  rejected: "Not selected this time.",
};

export default function JobDetailClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useSession();

  const [job, setJob] = useState<Job | null>(null);
  const [employer, setEmployer] = useState<Employer | null>(null);
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<{ status: string } | null>(null);
  const [justPosted, setJustPosted] = useState(false);
  const [shared, setShared] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [note, setNote] = useState("");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [availability, setAvailability] = useState("");
  const [docs, setDocs] = useState<Partial<Record<DocField, string>>>({});
  const [uploading, setUploading] = useState<DocField | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    setJustPosted(new URLSearchParams(window.location.search).get("posted") === "1");
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("jobs")
        .select(
          "id, title, description, requirements, job_type, salary_min, salary_max, salary_period, state, city, location, application_deadline, created_at, requires_nin, requires_cv, requires_photo, requires_age_proof, employer_id, job_perks(perks(name))",
        )
        .eq("id", id)
        .maybeSingle();
      if (data) {
        const perks = ((data.job_perks ?? []) as unknown as { perks: { name: string } | null }[]).map((jp) => jp.perks?.name).filter(Boolean) as string[];
        setJob({ ...(data as unknown as Job), perks });
        const emp = await loadEmployers(supabase, [data.employer_id]);
        setEmployer(emp[data.employer_id] ?? null);
      }
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    if (!user || !job) return;
    createClient()
      .from("job_applications")
      .select("status")
      .eq("job_id", job.id)
      .eq("applicant_id", user.id)
      .maybeSingle()
      .then(({ data }: { data: { status: string } | null }) => data && setExisting(data));
  }, [user, job]);

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-12 text-text-secondary" role="status">Loading job…</div>;
  if (!job)
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold mb-2">This job isn't available</h1>
        <p className="text-text-secondary mb-6">It may have been filled or taken down.</p>
        <Link href="/jobs" className="px-5 py-3 rounded-xl bg-primary text-white font-semibold">See open jobs</Link>
      </div>
    );

  const place = [job.city, job.state].filter(Boolean).join(", ");
  const pay = formatPay(job.salary_min, job.salary_max, job.salary_period ?? "monthly");
  const closed = isClosed(job.application_deadline);
  const ownJob = user?.id === job.employer_id;
  const requiredDocs = (["cv", "photo", "nin", "age_proof"] as DocField[]).filter((f) => job[`requires_${f}` as const]);
  const deadline = job.application_deadline
    ? new Date(job.application_deadline).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })
    : null;

  async function share() {
    const url = `${window.location.origin}/jobs/${job!.id}`;
    const text = shareText(job!.title, place || null, pay, url);
    try {
      if (navigator.share) {
        await navigator.share({ title: job!.title, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShared("Link copied");
    } catch {
      /* closed the share sheet */
    }
  }

  async function onFile(field: DocField, file: File) {
    if (!user) return;
    const problem = checkDocument(file, field === "photo");
    if (problem) return setFormError(problem);
    setFormError(null);
    setUploading(field);
    try {
      const stored = await uploadApplicationDocument(user.id, job!.id, field, file);
      setDocs((d) => ({ ...d, [field]: stored }));
    } catch {
      setFormError(`Couldn't upload your ${DOC_LABEL[field].toLowerCase()}. Check your connection and try again.`);
    } finally {
      setUploading(null);
    }
  }

  async function apply() {
    if (!user || applying) return;
    const missing = requiredDocs.filter((f) => !docs[f]);
    if (missing.length) return setFormError(`Add your ${missing.map((m) => DOC_LABEL[m].toLowerCase()).join(" and ")} to apply.`);
    setFormError(null);
    setApplying(true);
    const { error } = await createClient().from("job_applications").insert({
      job_id: job!.id,
      applicant_id: user.id,
      cover_letter: note.trim() || null,
      expected_salary: expectedSalary.trim() || null,
      availability: availability.trim() || null,
      cv_url: docs.cv ?? null,
      nin_url: docs.nin ?? null,
      photo_url: docs.photo ?? null,
      age_proof_url: docs.age_proof ?? null,
      status: "pending",
    });
    setApplying(false);
    if (error) {
      if (error.code === "23505") return setExisting({ status: "pending" });
      return setFormError("Couldn't send your application. Check your connection and try again.");
    }
    setExisting({ status: "pending" });
    setShowForm(false);
  }

  const back = (
    <button type="button" onClick={() => (window.history.length > 1 ? router.back() : router.push("/jobs"))} className="flex items-center gap-1.5 text-sm text-text-secondary mb-4 hover:text-text-primary">
      <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Back to jobs
    </button>
  );

  let applyPanel: React.ReactNode;
  if (ownJob) {
    applyPanel = (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="font-semibold text-text-primary">This is your job post.</p>
        <Link href="/profile?tab=jobs" className="mt-3 inline-block text-sm font-semibold text-primary underline underline-offset-2">See applications</Link>
      </div>
    );
  } else if (existing) {
    applyPanel = (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5" role="status">
        <p className="font-semibold text-green-900 flex items-center gap-2"><CheckCircle className="w-5 h-5" aria-hidden="true" /> You applied for this job</p>
        <p className="text-sm text-green-900 mt-1">{STATUS_TEXT[existing.status] ?? existing.status}</p>
        <Link href="/profile?tab=applications" className="mt-3 inline-block text-sm font-semibold text-green-900 underline underline-offset-2">See all my applications</Link>
      </div>
    );
  } else if (closed) {
    applyPanel = (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="font-semibold text-text-primary">Applications closed on {deadline}.</p>
        <Link href={`/jobs${job.state ? `?state=${encodeURIComponent(job.state)}` : ""}`} className="mt-3 inline-block text-sm font-semibold text-primary underline underline-offset-2">See other jobs{job.state ? ` in ${job.state}` : ""}</Link>
      </div>
    );
  } else if (!user) {
    applyPanel = (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="font-semibold text-text-primary">Create a free profile to apply</p>
        <p className="text-sm text-text-secondary mt-1">Your profile is your application, so you won't fill in long forms.</p>
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <Link href={`/signup?role=artisan`} className="flex-1 text-center px-4 py-3 rounded-xl bg-primary text-white font-semibold">Create free profile</Link>
          <Link href={`/login?next=${encodeURIComponent(`/jobs/${job.id}`)}`} className="flex-1 text-center px-4 py-3 rounded-xl border border-gray-200 font-semibold">Log in to apply</Link>
        </div>
      </div>
    );
  } else if (user.is_company && !user.is_artisan) {
    applyPanel = (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="font-semibold text-text-primary">Company accounts can't apply for jobs.</p>
        <p className="text-sm text-text-secondary mt-1">Log in with a personal profile to apply.</p>
      </div>
    );
  } else if (!showForm) {
    applyPanel = (
      <Button variant="primary" className="w-full" onClick={() => setShowForm(true)}>
        Apply for this job
      </Button>
    );
  } else {
    applyPanel = (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <h2 className="font-semibold text-text-primary">Apply with your profile</h2>
        <p className="text-sm text-text-secondary">The employer sees your profile, phone number and skills{requiredDocs.length ? ", plus what they asked for below" : ""}.</p>

        {requiredDocs.map((field) => (
          <div key={field}>
            <span className="block text-sm font-semibold mb-1">{DOC_LABEL[field]} (required)</span>
            <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary">
              {docs[field] ? <CheckCircle className="w-5 h-5 text-green-600" aria-hidden="true" /> : <Upload className="w-5 h-5 text-gray-400" aria-hidden="true" />}
              <span className="text-sm">{uploading === field ? "Uploading…" : docs[field] ? "Added. Tap to replace" : `Add ${DOC_LABEL[field].toLowerCase()}`}</span>
              <input
                type="file"
                className="sr-only"
                accept={field === "photo" ? "image/*" : ".pdf,.doc,.docx,image/*"}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) onFile(field, f);
                }}
              />
            </label>
            {field === "nin" && <p className="text-xs text-text-secondary mt-1">Only send ID if you trust this employer. Never pay to apply for a job.</p>}
          </div>
        ))}

        <div>
          <label htmlFor="ap-note" className="block text-sm font-semibold mb-1">Short note to the employer (optional)</label>
          <textarea id="ap-note" rows={3} maxLength={1500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why you're a good fit, in a few lines." className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="ap-pay" className="block text-sm font-semibold mb-1">Expected pay (optional)</label>
            <input id="ap-pay" value={expectedSalary} onChange={(e) => setExpectedSalary(e.target.value)} maxLength={40} placeholder="₦120,000 a month" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label htmlFor="ap-when" className="block text-sm font-semibold mb-1">Best time to call (optional)</label>
            <input id="ap-when" value={availability} onChange={(e) => setAvailability(e.target.value)} maxLength={80} placeholder="Weekdays after 4pm" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>

        {formError && <p role="alert" className="text-sm font-semibold text-red-700 bg-red-50 rounded-lg px-3 py-2">{formError}</p>}

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
          <Button variant="primary" className="flex-1" isLoading={applying} disabled={!!uploading} onClick={apply}>Send application</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-32">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {back}

        {justPosted && ownJob && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4" role="status">
            <p className="font-semibold text-green-900">Your job is live.</p>
            <p className="text-sm text-green-900 mt-1">Share it on WhatsApp to reach more people near you.</p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {employer?.logo_url ? <img src={employer.logo_url} className="w-full h-full object-cover" alt="" /> : <Briefcase className="w-6 h-6 text-primary" aria-hidden="true" />}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-text-primary leading-tight">{job.title}</h1>
              {employer?.name && <p className="text-sm text-text-secondary mt-0.5">{employer.name}</p>}
            </div>
          </div>

          {pay && <p className="mt-4 text-lg font-bold text-primary">{pay}</p>}

          <div className="flex flex-wrap gap-2 mt-3 text-xs text-text-secondary">
            {place && <span className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-full"><MapPin className="w-3.5 h-3.5" aria-hidden="true" />{place}{job.location ? ` (${job.location})` : ""}</span>}
            {job.job_type && <span className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-full"><Briefcase className="w-3.5 h-3.5" aria-hidden="true" />{job.job_type}</span>}
            <span className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-full"><Clock className="w-3.5 h-3.5" aria-hidden="true" />{postedAgo(job.created_at)}</span>
          </div>

          {deadline && (
            <p className={`mt-3 flex items-center gap-2 text-sm px-3 py-2 rounded-xl ${closed ? "text-gray-700 bg-gray-100" : "text-orange-800 bg-orange-50"}`}>
              <Calendar className="w-4 h-4" aria-hidden="true" /> {closed ? `Closed on ${deadline}` : `Apply by ${deadline}`}
            </p>
          )}

          {job.perks.length > 0 && (
            <div className="mt-4">
              <h2 className="text-sm font-semibold text-text-primary mb-2">Perks</h2>
              <ul className="flex flex-wrap gap-2">
                {job.perks.map((p) => <li key={p} className="text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-full font-semibold">{p}</li>)}
              </ul>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText(job.title, place || null, pay, typeof window !== "undefined" ? `${window.location.origin}/jobs/${job.id}` : `/jobs/${job.id}`))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold"
            >
              Share on WhatsApp
            </a>
            <button type="button" onClick={share} className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold flex items-center gap-1.5">
              <Share2 className="w-4 h-4" aria-hidden="true" /> {shared ?? "Share link"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <h2 className="font-semibold text-text-primary mb-3">About the job</h2>
          <p className="text-sm text-text-secondary whitespace-pre-line leading-relaxed">{job.description || "The employer hasn't added a description."}</p>
        </div>

        {job.requirements && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
            <h2 className="font-semibold text-text-primary mb-3">Requirements</h2>
            <p className="text-sm text-text-secondary whitespace-pre-line leading-relaxed">{job.requirements}</p>
          </div>
        )}

        {applyPanel}
      </div>
    </div>
  );
}
