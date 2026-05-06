import JobDetailClient from "./JobDetailClient";
import { createClient } from "@/lib/supabase/client";

export async function generateStaticParams() {
  const supabase = createClient();
  const { data } = await supabase.from("jobs").select("id");
  return (data ?? []).map((job: { id: string }) => ({ id: job.id }));
}

export default function JobDetailPage() {
  return <JobDetailClient />;
}