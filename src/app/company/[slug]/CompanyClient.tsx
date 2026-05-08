"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageLoader } from "@/components/layout/PageLoader";
import {
  MapPin, Globe, CheckCircle, ChevronLeft,
  Briefcase, Clock, Share2, Building2,
} from "lucide-react";

interface Company {
  id: string;
  full_name: string;
  company_name: string | null;
  company_slug: string | null;
  company_description: string | null;
  company_website: string | null;
  company_logo_url: string | null;
  company_size: string | null;
  industry: string | null;
  business_type: string | null;
  city: string | null;
  state: string | null;
  verification_status: string | null;
  profile_image_url: string | null;
}

interface Job {
  id: string;
  title: string;
  job_type: string;
  state: string | null;
  city: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_period: string;
  created_at: string;
  application_deadline: string | null;
}

interface Post {
  id: number;
  caption: string | null;
  media_urls: string[];
}

export default function CompanyClient() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, [slug]);

  async function fetchAll() {
    const supabase = createClient();

    // Try company_slug first, fall back to id
    const { data: bySlug } = await supabase
      .from("profiles")
      .select("*")
      .eq("company_slug", slug)
      .maybeSingle();

    const { data: byId } = !bySlug
      ? await supabase.from("profiles").select("*").eq("id", slug).maybeSingle()
      : { data: null };

    const profile = bySlug || byId;
    if (!profile) { setLoading(false); return; }
    setCompany(profile as Company);

    // Fetch active jobs
    const { data: jobData } = await supabase
      .from("jobs")
      .select("id, title, job_type, state, city, salary_min, salary_max, salary_period, created_at, application_deadline")
      .eq("employer_id", profile.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (jobData) setJobs(jobData);

    // Fetch posts
    const { data: postData } = await supabase
      .from("posts")
      .select("id, caption, post_media(media_url, order)")
      .eq("user_id", profile.id)
      .eq("post_type", "image_carousel")
      .order("created_at", { ascending: false })
      .limit(4);

    if (postData) {
      setPosts(postData.map((p: any) => ({
        ...p,
        media_urls: p.post_media
          .sort((a: any, b: any) => a.order - b.order)
          .map((m: any) => m.media_url),
      })));
    }

    setLoading(false);
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
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  }

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: company?.company_name || "", url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  if (loading) return <PageLoader />;
  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-secondary">Company not found</p>
      </div>
    );
  }

  const displayName = company.company_name || company.full_name;
  const location = [company.city, company.state].filter(Boolean).join(", ");
  const logo = company.company_logo_url || company.profile_image_url;

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Image lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img src={selectedImage} alt="" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-text-secondary mb-4 hover:text-text-primary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        {/* Company Header */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <div className="flex items-start gap-4">
            {/* Logo */}
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0">
              {logo ? (
                <img src={logo} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-8 h-8 text-primary" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-text-primary">{displayName}</h1>
                {company.verification_status === "verified" && (
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                )}
              </div>

              {company.industry && (
                <p className="text-sm text-text-secondary mt-0.5">{company.industry}</p>
              )}

              {location && (
                <div className="flex items-center gap-1 text-xs text-text-secondary mt-1">
                  <MapPin className="w-3.5 h-3.5" /> {location}
                </div>
              )}

              <div className="flex flex-wrap gap-2 mt-2">
                {company.business_type && (
                  <span className="text-xs bg-surface px-2.5 py-1 rounded-full text-text-secondary border border-gray-100">
                    {company.business_type}
                  </span>
                )}
                {company.company_size && (
                  <span className="text-xs bg-surface px-2.5 py-1 rounded-full text-text-secondary border border-gray-100">
                    {company.company_size} employees
                  </span>
                )}
                {jobs.length > 0 && (
                  <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium border border-green-100">
                    <Briefcase className="w-3 h-3 inline mr-1" />
                    Hiring
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-4">
            {company.company_website && (
              <a
                href={company.company_website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-text-secondary hover:border-primary hover:text-primary transition-colors"
              >
                <Globe className="w-4 h-4" /> Website
              </a>
            )}
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-text-secondary hover:border-primary hover:text-primary transition-colors"
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
          </div>
        </div>

        {/* About */}
        {company.company_description && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
            <h2 className="font-semibold text-text-primary mb-2">About</h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              {company.company_description}
            </p>
          </div>
        )}

        {/* Posts / Gallery */}
        {posts.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
            <h2 className="font-semibold text-text-primary mb-3">Gallery</h2>
            <div className="grid grid-cols-2 gap-3">
              {posts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => setSelectedImage(post.media_urls[0])}
                  className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group"
                >
                  <img
                    src={post.media_urls[0]}
                    alt={post.caption || ""}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  {post.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-xs truncate">{post.caption}</p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Jobs */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text-primary">Open Positions</h2>
            {jobs.length > 0 && (
              <span className="text-xs text-text-secondary">{jobs.length} open</span>
            )}
          </div>

          {jobs.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-text-secondary">No open positions right now</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => {
                const salary = formatSalary(job.salary_min, job.salary_max, job.salary_period);
                const deadline = job.application_deadline
                  ? new Date(job.application_deadline) < new Date()
                    ? null
                    : new Date(job.application_deadline).toLocaleDateString("en-NG", { day: "numeric", month: "short" })
                  : null;

                return (
                  <button
                    key={job.id}
                    onClick={() => router.push(`/jobs/${job.id}`)}
                    className="w-full bg-surface rounded-xl p-4 text-left hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-text-primary text-sm">{job.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          {(job.city || job.state) && (
                            <span className="flex items-center gap-1 text-xs text-text-secondary">
                              <MapPin className="w-3 h-3" />
                              {[job.city, job.state].filter(Boolean).join(", ")}
                            </span>
                          )}
                          <span className="text-xs text-text-secondary">{job.job_type}</span>
                          <span className="flex items-center gap-1 text-xs text-text-secondary">
                            <Clock className="w-3 h-3" /> {timeAgo(job.created_at)}
                          </span>
                        </div>
                        {salary && (
                          <p className="text-xs font-semibold text-primary mt-1">{salary}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-xs bg-primary text-white px-2.5 py-1 rounded-full font-medium">
                          Apply
                        </span>
                        {deadline && (
                          <span className="text-[10px] text-orange-600">
                            Closes {deadline}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}