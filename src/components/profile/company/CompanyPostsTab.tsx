"use client";
import { useState, useEffect, useRef } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { createClient } from "@/lib/supabase/client";
import { Plus, X } from "lucide-react";
import { useUIStore } from "@/store/uiStore";

interface Post {
  id: number;
  caption: string | null;
  media_urls: string[];
}

export function CompanyPostsTab() {
  const { user } = useSessionStore();
  const { addToast } = useUIStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [showForm, setShowForm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    fetchPosts();
  }, [user?.id]);

  async function fetchPosts() {
    const supabase = createClient();
    const { data } = await supabase
      .from("posts")
      .select("id, caption, post_media(media_url, order)")
      .eq("user_id", user!.id)
      .eq("post_type", "image_carousel")
      .order("created_at", { ascending: false });

    if (data) {
      setPosts(data.map((p: any) => ({
        ...p,
        media_urls: p.post_media
          .sort((a: any, b: any) => a.order - b.order)
          .map((m: any) => m.media_url),
      })));
    }
    setLoading(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (posts.length >= 4) {
      addToast("Maximum 4 images allowed", "error");
      return;
    }

    const compress = (f: File): Promise<Blob> =>
      new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(f);
        img.onload = () => {
          const MAX = 1200;
          let { width, height } = img;
          if (width > MAX) { height = (height * MAX) / width; width = MAX; }
          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
          canvas.toBlob((b) => resolve(b!), "image/webp", 0.82);
          URL.revokeObjectURL(url);
        };
        img.src = url;
      });

    setUploading(true);
    const supabase = createClient();

    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert({ user_id: user.id, post_type: "image_carousel", caption: caption || null })
      .select("id")
      .single();

    if (postError || !post) { addToast("Failed to create post", "error"); setUploading(false); return; }

    const compressed = await compress(file);
    const path = `posts/${user.id}-${post.id}-0.webp`;
    const { error: uploadError } = await supabase.storage
      .from("skilled-niger-assets")
      .upload(path, compressed, { upsert: true, contentType: "image/webp" });

    if (uploadError) { addToast("Upload failed", "error"); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from("skilled-niger-assets").getPublicUrl(path);
    await supabase.from("post_media").insert({
      post_id: post.id, user_id: user.id,
      media_url: publicUrl, media_type: "image", order: 0,
    });

    addToast("Image added", "success");
    setCaption("");
    setShowForm(false);
    await fetchPosts();
    setUploading(false);
  }

  async function deletePost(postId: number) {
    const supabase = createClient();
    await supabase.from("post_media").delete().eq("post_id", postId);
    await supabase.from("posts").delete().eq("id", postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    addToast("Image removed", "success");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-text-primary">Company Gallery</h3>
          <p className="text-xs text-text-secondary mt-0.5">{posts.length}/4 images</p>
        </div>
        {posts.length < 4 && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        )}
      </div>

      <div className="bg-surface rounded-xl p-3 text-xs text-text-secondary">
        Upload up to 4 images showcasing your company — office, team, projects, culture.
      </div>

      {showForm && (
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <textarea
            rows={2}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full py-2.5 border border-gray-200 rounded-xl text-sm text-text-secondary hover:border-primary hover:text-primary disabled:opacity-50 transition-colors"
          >
            {uploading ? "Uploading..." : "Choose Image"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(2)].map((_, i) => <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8 text-text-secondary text-sm">No images yet</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {posts.map((post) => (
            <div key={post.id} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100">
              <img src={post.media_urls[0]} alt={post.caption || ""} className="w-full h-full object-cover" />
              <button
                onClick={() => deletePost(post.id)}
                className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
              {post.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-white text-xs truncate">{post.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}