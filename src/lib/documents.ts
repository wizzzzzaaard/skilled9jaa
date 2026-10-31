"use client";

import { createClient } from "@/lib/supabase/client";

const PRIVATE_BUCKET = "application-docs";
const PUBLIC_BUCKET = "skilled-niger-assets";
export const PRIVATE_PREFIX = `private:${PRIVATE_BUCKET}/`;
export const MAX_DOC_MB = 10;

const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

export function checkDocument(file: File, imageOnly = false): string | null {
  if (file.size > MAX_DOC_MB * 1024 * 1024) return `That file is over ${MAX_DOC_MB} MB. Choose a smaller one.`;
  if (imageOnly && !file.type.startsWith("image/")) return "Choose a photo (JPG, PNG or WebP).";
  if (!imageOnly && file.type && !ALLOWED.includes(file.type)) return "Use a PDF, Word document or photo.";
  return null;
}

/**
 * Uploads an application document. Prefers the private bucket (readable only by
 * the applicant and that job's employer, once the jobs migration is applied);
 * falls back to the old public bucket under a random, unguessable name.
 * Returns the value to store in job_applications.
 */
export async function uploadApplicationDocument(userId: string, jobId: string, field: string, file: File): Promise<string> {
  const supabase = createClient();
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  const name = `${field}-${crypto.randomUUID()}.${ext}`;
  const privatePath = `${userId}/${jobId}/${name}`;
  const priv = await supabase.storage.from(PRIVATE_BUCKET).upload(privatePath, file, { contentType: file.type || undefined });
  if (!priv.error) return `${PRIVATE_PREFIX}${privatePath}`;

  const publicPath = `applications/${userId}/${jobId}/${name}`;
  const pub = await supabase.storage.from(PUBLIC_BUCKET).upload(publicPath, file, { contentType: file.type || undefined });
  if (pub.error) throw pub.error;
  return supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(publicPath).data.publicUrl;
}

/** Opens a stored document: private ones through a 5-minute signed link. */
export async function documentLink(stored: string): Promise<string | null> {
  if (!stored.startsWith(PRIVATE_PREFIX)) return stored;
  const { data, error } = await createClient().storage.from(PRIVATE_BUCKET).createSignedUrl(stored.slice(PRIVATE_PREFIX.length), 300);
  return error ? null : data.signedUrl;
}
