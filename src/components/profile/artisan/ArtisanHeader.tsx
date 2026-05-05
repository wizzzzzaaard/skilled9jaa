"use client";
import { useRef } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { createClient } from "@/lib/supabase/client";
import { Share2, CheckCircle } from "lucide-react";

export function ArtisanHeader() {
  const { user, refreshUser } = useSessionStore();
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const initials = user.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const compress = (f: File): Promise<Blob> =>
      new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(f);
        img.onload = () => {
          const MAX = 400;
          let { width, height } = img;
          if (width > MAX) { height = (height * MAX) / width; width = MAX; }
          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
          canvas.toBlob((b) => resolve(b!), "image/webp", 0.8);
          URL.revokeObjectURL(url);
        };
        img.src = url;
      });

    const compressed = await compress(file);
    const supabase = createClient();
    const path = `profiles/${user.id}/avatar.webp`;
    await supabase.storage.from("skilled-niger-assets").upload(path, compressed, { upsert: true, contentType: "image/webp" });
    const { data: { publicUrl } } = supabase.storage.from("skilled-niger-assets").getPublicUrl(path);
    await supabase.from("profiles").update({ profile_image_url: publicUrl }).eq("id", user.id);
    await refreshUser();
  }

  async function handleShare() {
    const url = `${window.location.origin}/provider/${user?.slug || user?.id}`;
    if (navigator.share) {
      await navigator.share({ title: user?.full_name || "", url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
      <p className="text-xs text-text-secondary mb-4">Worker Profile · Manage your profile and settings</p>

      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div
            className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold cursor-pointer overflow-hidden"
            onClick={() => fileRef.current?.click()}
          >
            {user.profile_image_url ? (
              <img src={user.profile_image_url} alt={user.full_name} className="w-full h-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white shadow"
          >
            <span className="text-xs">✏️</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-text-primary text-lg leading-tight">{user.full_name}</h2>
            {user.verification_status === "verified" && (
              <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-text-secondary truncate">{user.email}</p>
          <a
            href="https://wa.me/2348166888001"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary font-medium"
          >
            Need help? Click to reach us
          </a>
        </div>
      </div>

      {/* Bio */}
      {user.bio && <p className="text-sm text-text-secondary mt-3">{user.bio}</p>}

      {/* Status */}
      <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-green-50 rounded-xl">
        <CheckCircle className="w-4 h-4 text-green-600" />
        <span className="text-xs text-green-700 font-medium">Profile is live and searchable!</span>
      </div>

      {/* Share */}
      <button
        onClick={handleShare}
        className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-primary text-primary font-semibold text-sm"
      >
        <Share2 className="w-4 h-4" />
        Share Profile
      </button>
    </div>
  );
}