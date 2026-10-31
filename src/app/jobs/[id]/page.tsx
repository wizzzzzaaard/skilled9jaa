import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import JobDetailClient from "./JobDetailClient";
import { formatPay } from "@/lib/jobs";

// Refresh pre-rendered job pages every 10 minutes; new jobs render on first visit.
export const revalidate = 600;

function anon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

interface PublicJob {
  id: string;
  title: string;
  description: string | null;
  job_type: string | null;
  state: string | null;
  city: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_period: string | null;
  application_deadline: string | null;
  created_at: string;
  employer_id: string;
}

async function getJob(id: string): Promise<{ job: PublicJob; employer: string | null } | null> {
  const supabase = anon();
  if (!supabase || !/^[0-9a-z-]{4,64}$/i.test(id)) return null;
  try {
    const { data } = await supabase
      .from("jobs")
      .select("id, title, description, job_type, state, city, salary_min, salary_max, salary_period, application_deadline, created_at, employer_id")
      .eq("id", id)
      .eq("status", "active")
      .maybeSingle();
    if (!data) return null;
    const emp = await supabase.from("public_employers").select("name").eq("id", data.employer_id).maybeSingle();
    return { job: data as PublicJob, employer: emp.error ? null : (emp.data?.name ?? null) };
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  const supabase = anon();
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("jobs").select("id").eq("status", "active");
    return (data ?? []).map((job: { id: string }) => ({ id: job.id }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const found = await getJob(params.id);
  if (!found) return { title: "Job | Skilled9ja" };
  const { job, employer } = found;
  const place = [job.city, job.state].filter(Boolean).join(", ");
  const pay = formatPay(job.salary_min, job.salary_max, job.salary_period ?? "monthly");
  const title = `${job.title}${place ? ` in ${place}` : ""}${employer ? ` at ${employer}` : ""} | Skilled9ja`;
  const description = [job.job_type, pay, (job.description ?? "").replace(/\s+/g, " ").slice(0, 120)].filter(Boolean).join(". ");
  return {
    title,
    description,
    alternates: { canonical: `/jobs/${job.id}` },
    openGraph: { title, description, type: "website", url: `/jobs/${job.id}`, siteName: "Skilled9ja" },
  };
}

const EMPLOYMENT: Record<string, string> = { "Full-time": "FULL_TIME", "Part-time": "PART_TIME", Contract: "CONTRACTOR", Freelance: "CONTRACTOR" };

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const found = await getJob(params.id);
  // Google for Jobs needs the hiring organisation's name, so the listing data is
  // only added once the public_employers view exists.
  const jsonLd =
    found && found.employer
      ? {
          "@context": "https://schema.org",
          "@type": "JobPosting",
          title: found.job.title,
          description: (found.job.description ?? found.job.title).slice(0, 5000),
          datePosted: found.job.created_at,
          ...(found.job.application_deadline ? { validThrough: found.job.application_deadline } : {}),
          ...(found.job.job_type && EMPLOYMENT[found.job.job_type] ? { employmentType: EMPLOYMENT[found.job.job_type] } : {}),
          hiringOrganization: { "@type": "Organization", name: found.employer },
          jobLocation: {
            "@type": "Place",
            address: { "@type": "PostalAddress", addressLocality: found.job.city ?? undefined, addressRegion: found.job.state ?? undefined, addressCountry: "NG" },
          },
          ...(found.job.salary_min || found.job.salary_max
            ? {
                baseSalary: {
                  "@type": "MonetaryAmount",
                  currency: "NGN",
                  value: { "@type": "QuantitativeValue", minValue: found.job.salary_min ?? found.job.salary_max, maxValue: found.job.salary_max ?? found.job.salary_min, unitText: "MONTH" },
                },
              }
            : {}),
        }
      : null;

  return (
    <>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      )}
      <JobDetailClient />
    </>
  );
}
