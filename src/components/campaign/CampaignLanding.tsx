import Link from "next/link";
import type { Campaign } from "@/lib/campaigns";
import { CampaignSignupForm } from "./CampaignSignupForm";
import { CampaignModule } from "./CampaignModules";
import { RoadStrip } from "./RoadStrip";
import { JoinLink, StickyCta } from "./StickyCta";
import s from "./campaign.module.css";

const ROAD_TITLE: Record<Campaign["audience"], string> = {
  provider: "Work is closer than you think",
  job_seeker: "Jobs around where you live",
  company: "Candidates around your business",
  client: "Pros around you",
};

const ROAD_CAPTION: Record<Campaign["audience"], string> = {
  provider: "Examples of what people nearby ask for. Closest shows first.",
  job_seeker: "Examples of the kind of openings near you. Closest shows first.",
  company: "Examples of applicants near a workplace. Closest shows first.",
  client: "Examples of pros near you. Closest shows first.",
};

export function CampaignLanding({ campaign, openJobs }: { campaign: Campaign; openJobs: number | null }) {
  const c = campaign;
  return (
    <div className={s.root}>
      <a href="#join" className={s.srOnly}>
        Skip to signup form
      </a>

      <header className={s.wrap}>
        <div className={s.bar}>
          <Link href="/" className={s.logo} aria-label="Skilled9ja home">
            Skilled<span>9ja</span>
          </Link>
          <Link href="/login" className={s.login}>
            Log in
          </Link>
        </div>
      </header>

      <main>
        <section className={s.wrap}>
          <div className={s.hero}>
            <div>
              <h1 className={s.headline}>{c.headline}</h1>
              <p className={s.sub}>{c.sub}</p>
              <ul className={s.heroPoints}>
                {c.benefits.map((b) => (
                  <li key={b.title}>
                    <div>
                      <b>{b.title}</b>
                      <span>{b.body}</span>
                    </div>
                  </li>
                ))}
              </ul>
              {c.showOpenJobs && openJobs !== null && openJobs > 0 && (
                <p className={s.liveCount}>
                  <strong>{openJobs.toLocaleString("en-NG")}</strong> open jobs on Skilled9ja right now
                </p>
              )}
            </div>
            <CampaignSignupForm slug={c.slug} role={c.role} title={c.formTitle} cta={c.cta} />
          </div>
        </section>

        <RoadStrip title={ROAD_TITLE[c.audience]} caption={ROAD_CAPTION[c.audience]} items={c.nearby} />

        <section className={`${s.section} ${s.sectionWhite}`}>
          <div className={s.wrap}>
            <CampaignModule campaign={c} />
          </div>
        </section>

        <section className={s.section}>
          <div className={s.wrap}>
            <h2 className={s.h2}>What you get</h2>
            <ul className={s.benefits}>
              {c.benefits.map((b) => (
                <li key={b.title}>
                  <h3>{b.title}</h3>
                  <p>{b.body}</p>
                </li>
              ))}
            </ul>

            <h2 className={s.h2} style={{ marginTop: "3.5rem" }}>
              How it works
            </h2>
            <ol className={s.steps}>
              {c.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </section>

        <section className={`${s.section} ${s.sectionWhite}`}>
          <div className={s.wrap}>
            <h2 className={s.h2}>Questions people ask</h2>
            <div className={s.faq}>
              {c.faq.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className={s.closing}>
          <div className={s.wrap}>
            <div className={s.closingRow}>
              <h2 className={s.h2}>{c.formTitle}. It's free and takes about a minute.</h2>
              <JoinLink label={c.cta} className={s.closingBtn} />
            </div>
          </div>
        </section>
      </main>

      <footer className={`${s.wrap} ${s.foot}`}>
        {c.note && <p>{c.note}</p>}
        <nav aria-label="Footer">
          <Link href="/about">About Skilled9ja</Link>
          <Link href="/privacy">Privacy notice</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/login">Log in</Link>
        </nav>
        <p style={{ marginTop: "0.75rem" }}>© {new Date().getFullYear()} Skilled9ja</p>
      </footer>

      <StickyCta label={c.cta} />
    </div>
  );
}
