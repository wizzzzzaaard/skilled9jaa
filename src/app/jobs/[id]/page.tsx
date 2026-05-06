import { createClient } from "@supabase/supabase-js";
import JobDetailClient from "./JobDetailClient";

export async function generateStaticParams() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase.from("jobs").select("id");
  return (data ?? []).map((job: { id: string }) => ({ id: job.id }));
}

export default function JobDetailPage() {
  return <JobDetailClient />;
}