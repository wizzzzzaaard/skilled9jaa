import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import "@fontsource-variable/bricolage-grotesque/wdth.css";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import { CAMPAIGN_SLUGS, getCampaign } from "@/lib/campaigns";
import { CampaignLanding } from "@/components/campaign/CampaignLanding";

// Only the slugs in lib/campaigns render here; anything else is a 404,
// so this route never swallows a typo meant for another page.
export const dynamicParams = false;
// Refresh the live job count once an hour.
export const revalidate = 3600;

export function generateStaticParams() {
  return CAMPAIGN_SLUGS.map((niche) => ({ niche }));
}

export function generateMetadata({ params }: { params: { niche: string } }): Metadata {
  const c = getCampaign(params.niche);
  if (!c) return {};
  return {
    title: c.seoTitle,
    description: c.seoDescription,
    alternates: { canonical: `/${c.slug}` },
    openGraph: { title: c.seoTitle, description: c.seoDescription, type: "website", url: `/${c.slug}`, siteName: "Skilled9ja", locale: "en_NG" },
    twitter: { card: "summary_large_image", title: c.seoTitle, description: c.seoDescription },
  };
}

async function countOpenJobs(): Promise<number | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { count, error } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");
    return error ? null : count ?? null;
  } catch {
    return null; // the page still renders without the number
  }
}

export default async function NichePage({ params }: { params: { niche: string } }) {
  const campaign = getCampaign(params.niche);
  if (!campaign) notFound();

  const openJobs = campaign.showOpenJobs ? await countOpenJobs() : null;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: campaign.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // JSON from our own static config; '<' is escaped so it can't close the tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />
      <CampaignLanding campaign={campaign} openJobs={openJobs} />
    </>
  );
}
