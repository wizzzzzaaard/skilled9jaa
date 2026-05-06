"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageLoader } from "@/components/layout/PageLoader";
import {
  MapPin, Share2, CheckCircle, ChevronLeft,
  Phone, Instagram, Twitter, Linkedin, MessageCircle,
  Briefcase, Image as ImageIcon, Video,
} from "lucide-react";

interface ProviderProfile {
  id: string;
  full_name: string;
  slug: string | null;
  profile_image_url: string | null;
  bio: string | null;
  provider_bio: string | null;
  city: string | null;
  state: string | null;
  lga: string | null;
  is_available_now: boolean;
  is_mock: boolean;
  years_of_experience: number | null;
  verification_status: string | null;
  phone_number: string | null;
  additional_phone_number: string | null;
  whatsapp_url: string | null;
  instagram_url: string | null;
  twitter: string | null;
  linkedin_url: string | null;
}

interface Skill {
  id: number;
  name: string;
  type: string;
}

interface Post {
  id: number;
  post_type: "image_carousel" | "video";
  caption: string | null;
  media_urls: string[];
}

export default function ProviderClient() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, [slug]);

  async function fetchAll() {
    const supabase = createClient();

    let query = supabase.from("profiles").select("*");
    const { data: bySlug } = await query.eq("slug", slug).maybeSingle();
    const { data: byId } = !bySlug
      ? await supabase.from("profiles").select("*").eq("id", slug).maybeSingle()
      : { data: null };

    const profile = bySlug || byId;
    if (!profile) { setLoading(false); return; }
    setProvider(profile as ProviderProfile);

    const { data: skillData } = await supabase
      .from("user_skills")
      .select("skill_id, skills(id, name, type)")
      .eq("user_id", profile.id);
    if (skillData) {
      setSkills(skillData.map((s: any) => s.skills).filter(Boolean));
    }

    const { data: postData } = await supabase
      .from("posts")
      .select("id, post_type, caption, post_media(media_url, order)")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });

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

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: provider?.full_name || "", url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  if (loading) return <PageLoader />;
  if (!provider) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-secondary">Profile not found</p>
      </div>
    );
  }

  const displayName = provider.is_mock
    ? `${provider.full_name.charAt(0)}. (Demo)`
    : provider.full_name;

  const locationParts = [provider.city, provider.state].filter(Boolean);
  const location = locationParts.join(", ");

  const artisanSkills = skills.filter((s) => s.type === "SKILL");
  const jobRoles = skills.filter((s) => s.type === "JOB");
  const images = posts.filter((p) => p.post_type === "image_carousel");
  const videos = posts.filter((p) => p.post_type === "video");

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Lightbox */}
      {selectedMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedMedia(null)}
        >
          {selectedMedia.endsWith(".mp4") || selectedMedia.includes("mp4") ? (
            <video src={selectedMedia} controls className="max-w-full max-h-full rounded-xl" />
          ) : (
            <img src={selectedMedia} alt="" className="max-w-full max-h-full rounded-xl object-contain" />
          )}
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

        {/* Header Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-primary/10 flex items-center justify-center">
                {provider.profile_image_url ? (
                  <img
                    src={provider.profile_image_url}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-primary">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              {provider.is_available_now && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-text-primary">{displayName}</h1>
                {provider.verification_status === "verified" && (
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                )}
              </div>

              {location && (
                <div className="flex items-center gap-1 text-sm text-text-secondary mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {location}
                </div>
              )}

              {provider.years_of_experience ? (
                <p className="text-xs text-text-secondary mt-1">
                  {provider.years_of_experience} year{provider.years_of_experience !== 1 ? "s" : ""} experience
                </p>
              ) : null}

              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 text-xs text-primary font-medium mt-2"
              >
                <Share2 className="w-3.5 h-3.5" /> Share Profile
              </button>
            </div>
          </div>

          {/* Mock notice */}
          {provider.is_mock && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
              <p className="text-sm text-yellow-800">
                👋 This is a demo profile. Real professionals near you are joining every day.
              </p>
            </div>
          )}

          {/* Skills pills */}
          {skills.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {artisanSkills.map((s) => (
                <span key={s.id} className="text-xs px-3 py-1 bg-accent/10 text-accent rounded-full font-medium">
                  {s.name}
                </span>
              ))}
              {jobRoles.map((s) => (
                <span key={s.id} className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded-full font-medium">
                  {s.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Bio */}
        {(provider.bio || provider.provider_bio) && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
            <h2 className="font-semibold text-text-primary mb-2">About</h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              {provider.provider_bio || provider.bio}
            </p>
          </div>
        )}

        {/* Contact & Socials */}
        {!provider.is_mock && (
          provider.phone_number || provider.whatsapp_url ||
          provider.instagram_url || provider.twitter || provider.linkedin_url
        ) && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
            <h2 className="font-semibold text-text-primary mb-3">Contact & Links</h2>
            <div className="space-y-2">
              {provider.phone_number && (
                <a
                  href={`tel:${provider.phone_number}`}
                  className="flex items-center gap-3 p-3 bg-surface rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <Phone className="w-4 h-4 text-primary" />
                  <span className="text-sm text-text-primary">{provider.phone_number}</span>
                </a>
              )}
              {provider.additional_phone_number && (
                <a
                  href={`tel:${provider.additional_phone_number}`}
                  className="flex items-center gap-3 p-3 bg-surface rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <Phone className="w-4 h-4 text-text-secondary" />
                  <span className="text-sm text-text-primary">{provider.additional_phone_number}</span>
                </a>
              )}
              {provider.whatsapp_url && (
                <a
                  href={provider.whatsapp_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-surface rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-text-primary">WhatsApp</span>
                </a>
              )}
              {provider.instagram_url && (
                <a
                  href={`https://instagram.com/${provider.instagram_url.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-surface rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <Instagram className="w-4 h-4 text-pink-600" />
                  <span className="text-sm text-text-primary">{provider.instagram_url}</span>
                </a>
              )}
              {provider.twitter && (
                <a
                  href={`https://twitter.com/${provider.twitter.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-surface rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <Twitter className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-text-primary">{provider.twitter}</span>
                </a>
              )}
              {provider.linkedin_url && (
                <a
                  href={provider.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-surface rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <Linkedin className="w-4 h-4 text-blue-700" />
                  <span className="text-sm text-text-primary">LinkedIn</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Posts / Portfolio */}
        {posts.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-text-primary">Portfolio & Credentials</h2>
              <div className="flex items-center gap-3 text-xs text-text-secondary">
                {images.length > 0 && (
                  <span className="flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5" /> {images.length}
                  </span>
                )}
                {videos.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Video className="w-3.5 h-3.5" /> {videos.length}
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {posts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => setSelectedMedia(post.media_urls[0])}
                  className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group"
                >
                  {post.post_type === "video" ? (
                    <video
                      src={post.media_urls[0]}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={post.media_urls[0]}
                      alt={post.caption || ""}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  )}
                  {post.post_type === "video" && (
                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                      ▶ Video
                    </div>
                  )}
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

        {/* Book CTA */}
        {!provider.is_mock && (
          <div className="bg-primary rounded-2xl p-5 text-center">
            <h3 className="font-bold text-white text-lg mb-1">
              Ready to work with {provider.full_name.split(" ")[0]}?
            </h3>
            <p className="text-white/80 text-sm mb-4">
              Get in touch directly using the contact details above.
            </p>
            {provider.whatsapp_url && (
              <a
                href={provider.whatsapp_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-xl font-bold text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                Message on WhatsApp
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}