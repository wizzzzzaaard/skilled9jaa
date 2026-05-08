"use client";
import { useRef, useState } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { createClient } from "@/lib/supabase/client";
import { Share2, CheckCircle, Building2, Loader2 } from "lucide-react";

export function CompanyHeader() {
  const { user, refreshUser } = useSessionStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (!user) return null;

  const displayName = user.company_name || user.full_name;

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);

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
    const path = `profiles/${user.id}/company-logo.webp`;
    await supabase.storage.from("skilled-niger-assets").upload(path, compressed, { upsert: true, contentType: "image/webp" });
    const { data: { publicUrl } } = supabase.storage.from("skilled-niger-assets").getPublicUrl(path);
    await supabase.from("profiles").update({ company_logo_url: publicUrl }).eq("id", user.id);
    await refreshUser();
    setUploading(false);
  }

  async function handleShare() {
    const url = `${window.location.origin}/company/${user?.company_slug || user?.id}`;
    if (navigator.share) {
      await navigator.share({ title: displayName || "", url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
      <p className="text-xs text-text-secondary mb-4">Company Profile · Manage your company</p>

      <div className="flex items-start gap-4">
        <div className="relative flex-shrink-0">
          <div
            className={`w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden ${
              uploading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
            }`}
            onClick={() => !uploading && fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            ) : user.company_logo_url ? (
              <img src={user.company_logo_url} alt={displayName || ""} className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-7 h-7 text-primary" />
            )}
          </div>
          <button
            onClick={() => !uploading && fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white shadow text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✏️
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
            disabled={uploading}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-text-primary text-lg leading-tight">{displayName}</h2>
            {user.verification_status === "verified" && (
              <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-text-secondary truncate">{user.email}</p>
          {user.industry && (
            <p className="text-xs text-text-secondary mt-0.5">{user.industry}</p>
          )}
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

      <button
        onClick={handleShare}
        className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-primary text-primary font-semibold text-sm"
      >
        <Share2 className="w-4 h-4" /> Share Company Profile
      </button>
    </div>
  );
}