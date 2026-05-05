"use client";
import { useState, useEffect, useRef } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { createClient } from "@/lib/supabase/client";
import { Plus, X, Image, Video } from "lucide-react";
import { useUIStore } from "@/store/uiStore";

interface Post {
  id: number;
  post_type: "image_carousel" | "video";
  caption: string | null;
  media_urls: string[];
}

export function PostsTab() {
  const { user } = useSessionStore();
  const { addToast } = useUIStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [showForm, setShowForm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const imageCount = posts.filter((p) => p.post_type === "image_carousel").length;
  const videoCount = posts.filter((p) => p.post_type === "video").length;

  useEffect(() => {
    if (!user) return;
    fetchPosts();
  }, [user?.id]);

  async function fetchPosts() {
    const supabase = createClient();
    const { data } = await supabase
      .from("posts")
      .select("id, post_type, caption, post_media(media_url, order)")
      .eq("user_id", user!.id)
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

    const isVideo = file.type.startsWith("video/");

    if (isVideo && videoCount >= 1) {
      addToast("Maximum 1 video allowed", "error"); return;
    }
    if (!isVideo && imageCount >= 3) {
      addToast("Maximum 3 images allowed", "error"); return;
    }
    if (isVideo) {
      const vid = document.createElement("video");
      vid.src = URL.createObjectURL(file);
      await new Promise((r) => { vid.onloadedmetadata = r; });
      if (vid.duration > 30) {
        addToast("Video must be 30 seconds or less", "error"); return;
      }
    }

    setUploading(true);
    const supabase = createClient();
    const postType = isVideo ? "video" : "image_carousel";

    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert({ user_id: user.id, post_type: postType, caption: caption || null })
      .select("id")
      .single();

    if (postError || !post) { addToast("Failed to create post", "error"); setUploading(false); return; }

    const ext = file.name.split(".").pop();
    const path = `posts/${user.id}-${post.id}-0.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("skilled-niger-assets")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) { addToast("Upload failed", "error"); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from("skilled-niger-assets").getPublicUrl(path);

    await supabase.from("post_media").insert({
      post_id: post.id,
      user_id: user.id,
      media_url: publicUrl,
      media_type: isVideo ? "video" : "image",
      order: 0,
    });

    addToast("Post added", "success");
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
    addToast("Post deleted", "success");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-text-primary">My Credentials & Portfolio</h3>
          <p className="text-xs text-text-secondary mt-0.5">{imageCount}/3 images · {videoCount}/1 video</p>
        </div>
        {(imageCount < 3 || videoCount < 1) && (
          <button
            onClick={() => setShowForm(!showForm)}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> {uploading ? "Uploading..." : "Add"}
          </button>
        )}
      </div>

      <div className="bg-surface rounded-xl p-3 text-sm text-text-secondary">
        <p className="font-semibold text-text-primary mb-1">Showcase your credentials to potential employers</p>
        <p className="text-xs">Upload documents and media — CV, award certificates, recommendation letters, or work samples.</p>
        <p className="text-xs mt-1">📷 Up to 3 images · 🎬 1 pitch video (max 30 sec)</p>
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
          <div className="flex gap-2">
            <button
              onClick={() => { fileRef.current!.accept = "image/*"; fileRef.current?.click(); }}
              disabled={imageCount >= 3 || uploading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-sm text-text-secondary hover:border-primary hover:text-primary disabled:opacity-40 transition-colors"
            >
              <Image className="w-4 h-4" /> Add Image
            </button>
            <button
              onClick={() => { fileRef.current!.accept = "video/*"; fileRef.current?.click(); }}
              disabled={videoCount >= 1 || uploading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-sm text-text-secondary hover:border-primary hover:text-primary disabled:opacity-40 transition-colors"
            >
              <Video className="w-4 h-4" /> Add Video
            </button>
          </div>
          <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(2)].map((_, i) => <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8 text-text-secondary text-sm">No posts yet — add your first one</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {posts.map((post) => (
            <div key={post.id} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100">
              {post.post_type === "video" ? (
                <video src={post.media_urls[0]} className="w-full h-full object-cover" />
              ) : (
                <img src={post.media_urls[0]} alt={post.caption || ""} className="w-full h-full object-cover" />
              )}
              {post.post_type === "video" && (
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">▶ Pitch</div>
              )}
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