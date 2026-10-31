"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSessionStore } from "@/store/sessionStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EXPERIENCE_LEVELS, JOB_TYPES, NIGERIAN_STATES } from "@/lib/nigeria";

interface Perk {
  id: string;
  name: string;
}
interface Skill {
  id: number;
  name: string;
  type: string;
}
type Errors = Partial<Record<"title" | "state" | "city" | "salary" | "description" | "deadline" | "form", string>>;

const DRAFT_KEY = "s9_job_draft";
const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;
const toNumber = (v: string) => {
  const n = Number(v.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export function PostJobForm() {
  const router = useRouter();
  const { user, isLoading } = useSessionStore();

  const [title, setTitle] = useState("");
  const [jobType, setJobType] = useState<string>("Full-time");
  const [experience, setExperience] = useState<string>("Entry Level");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [deadline, setDeadline] = useState("");
  const [requiresCv, setRequiresCv] = useState(true);
  const [requiresPhoto, setRequiresPhoto] = useState(false);
  const [perkIds, setPerkIds] = useState<string[]>([]);
  const [skillIds, setSkillIds] = useState<number[]>([]);
  const [skillQuery, setSkillQuery] = useState("");

  const [perks, setPerks] = useState<Perk[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  // Prefill from the company profile, restore an unsaved draft, load perks and skills.
  useEffect(() => {
    if (user) {
      setState((s) => s || user.state || "");
      setCity((c) => c || user.city || "");
    }
  }, [user]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        setTitle(d.title ?? "");
        setDescription(d.description ?? "");
        setRequirements(d.requirements ?? "");
        setSalaryMin(d.salaryMin ?? "");
        setSalaryMax(d.salaryMax ?? "");
      }
    } catch {
      /* ignore */
    }
    const supabase = createClient();
    supabase.from("perks").select("id, name").order("name").then(({ data }) => data && setPerks(data as Perk[]));
    supabase.from("skills").select("id, name, type").order("name").then(({ data }) => data && setSkills(data as Skill[]));
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, description, requirements, salaryMin, salaryMax }));
    } catch {
      /* ignore */
    }
  }, [title, description, requirements, salaryMin, salaryMax]);

  const skillMatches = useMemo(() => {
    const q = skillQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return skills.filter((s) => s.name.toLowerCase().includes(q) && !skillIds.includes(s.id)).slice(0, 8);
  }, [skillQuery, skills, skillIds]);

  if (isLoading) return <div className="max-w-2xl mx-auto px-4 py-12 text-text-secondary">Loading…</div>;

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold mb-2">Post a job</h1>
        <p className="text-text-secondary mb-6">Create a free company account to post your first job.</p>
        <div className="flex justify-center gap-3">
          <Link href="/hire" className="px-5 py-3 rounded-xl bg-primary text-white font-semibold">Create company account</Link>
          <Link href="/login?next=/jobs/post" className="px-5 py-3 rounded-xl border border-gray-200 font-semibold">Log in</Link>
        </div>
      </div>
    );
  }

  if (!user.is_company) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold mb-2">Only company accounts can post jobs</h1>
        <p className="text-text-secondary mb-6">
          Add a company profile to your account, then come back here to post the role.
        </p>
        <Link href="/profile?tab=setup" className="px-5 py-3 rounded-xl bg-primary text-white font-semibold">Set up company profile</Link>
      </div>
    );
  }

  function validate(): Errors {
    const e: Errors = {};
    if (title.trim().length < 3) e.title = "Give the job a clear title, for example “Shop attendant”.";
    if (!state) e.state = "Choose the state the job is in.";
    if (city.trim().length < 2) e.city = "Enter the city or town.";
    const lo = toNumber(salaryMin);
    const hi = toNumber(salaryMax);
    if (!lo || !hi) e.salary = "Enter the lowest and highest monthly pay. Posts with pay get more applicants.";
    else if (hi < lo) e.salary = "The highest pay can't be less than the lowest.";
    else if (hi > 50_000_000) e.salary = "Check the pay: it looks too high for a monthly salary.";
    if (description.trim().length < 50) e.description = "Describe the job in at least 50 characters: the daily tasks and working hours.";
    if (deadline && new Date(deadline) < new Date(new Date().toDateString())) e.deadline = "The closing date must be today or later.";
    return e;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (saving || !user) return;
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const lo = toNumber(salaryMin);
    const hi = toNumber(salaryMax);
    const { data: job, error } = await supabase
      .from("jobs")
      .insert({
        employer_id: user.id,
        title: title.trim(),
        job_type: jobType,
        experience_level: experience,
        state,
        city: city.trim(),
        location: area.trim() || null,
        salary_min: lo,
        salary_max: hi,
        salary_period: "monthly",
        salary_range: `${lo.toLocaleString("en-NG")} - ${hi.toLocaleString("en-NG")}`,
        description: description.trim(),
        requirements: requirements.trim() || null,
        benefits: perks.filter((p) => perkIds.includes(p.id)).map((p) => p.name).join(", ") || null,
        required_skills: skillIds,
        requires_cv: requiresCv,
        requires_photo: requiresPhoto,
        application_deadline: deadline ? new Date(`${deadline}T23:59:59`).toISOString() : null,
        status: "active",
      })
      .select("id, status")
      .single();

    if (error || !job) {
      setSaving(false);
      setErrors({ form: "Couldn't post the job. Check your connection and try again." });
      return;
    }

    if (perkIds.length) {
      const { error: perkError } = await supabase.from("job_perks").insert(perkIds.map((perk_id) => ({ job_id: job.id, perk_id })));
      if (perkError) console.warn("perks not saved", perkError.message);
    }

    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    router.push(job.status === "active" ? `/jobs/${job.id}?posted=1` : "/profile?tab=jobs");
  }

  const lo = toNumber(salaryMin);
  const hi = toNumber(salaryMax);
  const selectCls = "w-full px-4 py-3 border border-gray-200 rounded-lg text-base sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary">Post a job</h1>
      <p className="text-text-secondary mt-1">People near your workplace see it first. Jobs with pay and perks get more applicants.</p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-6">
        <Input label="Job title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} error={errors.title} placeholder="Shop attendant" />

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="job-type" className="block text-sm font-semibold mb-1.5">Job type</label>
            <select id="job-type" className={selectCls} value={jobType} onChange={(e) => setJobType(e.target.value)}>
              {JOB_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="job-exp" className="block text-sm font-semibold mb-1.5">Experience</label>
            <select id="job-exp" className={selectCls} value={experience} onChange={(e) => setExperience(e.target.value)}>
              {EXPERIENCE_LEVELS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold mb-2">Where is the job?</legend>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="job-state" className="block text-sm font-semibold mb-1.5">State</label>
              <select
                id="job-state"
                className={selectCls}
                value={state}
                onChange={(e) => setState(e.target.value)}
                aria-invalid={errors.state ? true : undefined}
                aria-describedby={errors.state ? "job-state-err" : undefined}
              >
                <option value="">Choose a state</option>
                {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
              {errors.state && <p id="job-state-err" className="mt-1 text-xs text-error">{errors.state}</p>}
            </div>
            <Input label="City or town" value={city} onChange={(e) => setCity(e.target.value)} error={errors.city} placeholder="Ikeja" />
          </div>
          <Input label="Area or landmark (optional)" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Opposite Computer Village" helperText="Helps applicants judge the trip. Don't include a full street address." />
        </fieldset>

        <fieldset>
          <legend className="text-lg font-semibold mb-2">Monthly pay</legend>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Lowest (₦)" inputMode="numeric" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} aria-invalid={errors.salary ? true : undefined} placeholder="80,000" />
            <Input label="Highest (₦)" inputMode="numeric" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} aria-invalid={errors.salary ? true : undefined} placeholder="120,000" />
          </div>
          {errors.salary ? (
            <p className="mt-1 text-xs text-error" role="alert">{errors.salary}</p>
          ) : lo && hi && hi >= lo ? (
            <p className="mt-1 text-xs text-text-secondary">Shown as {naira(lo)} to {naira(hi)} a month.</p>
          ) : null}
        </fieldset>

        <div>
          <label htmlFor="job-desc" className="block text-sm font-semibold mb-1.5">What the job involves</label>
          <textarea
            id="job-desc"
            rows={6}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={4000}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby="job-desc-note"
            placeholder="Daily tasks, working days and hours, who they report to."
          />
          <p id="job-desc-note" className={`mt-1 text-xs ${errors.description ? "text-error" : "text-text-secondary"}`}>
            {errors.description ?? `${description.trim().length} characters (at least 50)`}
          </p>
        </div>

        <div>
          <label htmlFor="job-req" className="block text-sm font-semibold mb-1.5">Requirements (optional)</label>
          <textarea id="job-req" rows={3} className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={requirements} onChange={(e) => setRequirements(e.target.value)} maxLength={2000} placeholder="Qualifications, experience, languages." />
        </div>

        {perks.length > 0 && (
          <fieldset>
            <legend className="text-lg font-semibold mb-2">Perks</legend>
            <div className="flex flex-wrap gap-2">
              {perks.map((p) => {
                const on = perkIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setPerkIds((ids) => (on ? ids.filter((i) => i !== p.id) : [...ids, p.id]))}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${on ? "bg-primary text-white border-primary" : "bg-white border-gray-200"}`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <div>
          <label htmlFor="job-skill" className="block text-sm font-semibold mb-1.5">Skills (optional, up to 5)</label>
          {skillIds.length > 0 && (
            <ul className="flex flex-wrap gap-2 mb-2" aria-label="Chosen skills">
              {skillIds.map((id) => (
                <li key={id}>
                  <button type="button" onClick={() => setSkillIds((ids) => ids.filter((i) => i !== id))} className="px-3 py-1.5 rounded-full text-sm font-semibold bg-gray-100" aria-label={`Remove ${skills.find((s) => s.id === id)?.name}`}>
                    {skills.find((s) => s.id === id)?.name} ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
          {skillIds.length < 5 && (
            <>
              <input id="job-skill" className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={skillQuery} onChange={(e) => setSkillQuery(e.target.value)} placeholder="Type to search, for example Cashier" autoComplete="off" />
              {skillMatches.length > 0 && (
                <ul className="mt-1 border border-gray-200 rounded-lg divide-y bg-white">
                  {skillMatches.map((s) => (
                    <li key={s.id}>
                      <button type="button" className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50" onClick={() => { setSkillIds((ids) => [...ids, s.id]); setSkillQuery(""); }}>
                        {s.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <fieldset>
          <legend className="text-lg font-semibold mb-2">What applicants must send</legend>
          <label className="flex items-center gap-3 py-1"><input type="checkbox" className="w-5 h-5 accent-[#1B4332]" checked={requiresCv} onChange={(e) => setRequiresCv(e.target.checked)} /> CV</label>
          <label className="flex items-center gap-3 py-1"><input type="checkbox" className="w-5 h-5 accent-[#1B4332]" checked={requiresPhoto} onChange={(e) => setRequiresPhoto(e.target.checked)} /> A recent photo</label>
          <p className="text-xs text-text-secondary mt-1">Never ask applicants to pay to apply. It breaks our Terms.</p>
        </fieldset>

        <Input label="Closing date (optional)" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} error={errors.deadline} />

        {errors.form && <p role="alert" className="text-sm font-semibold text-red-700 bg-red-50 rounded-lg px-3 py-2">{errors.form}</p>}

        <Button type="submit" variant="primary" size="lg" isLoading={saving} className="w-full">
          Post job
        </Button>
      </form>
    </div>
  );
}
