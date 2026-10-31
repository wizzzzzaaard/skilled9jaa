import type { Campaign } from "@/lib/campaigns";
import { CommuteCalculator } from "./CommuteCalculator";
import s from "./campaign.module.css";

const Checks = ({ items }: { items: string[] }) => (
  <ul className={s.checks}>
    {items.map((i) => (
      <li key={i}>{i}</li>
    ))}
  </ul>
);

const Chips = ({ items, label }: { items: string[]; label: string }) => (
  <ul className={s.chips} aria-label={label}>
    {items.map((i) => (
      <li key={i}>{i}</li>
    ))}
  </ul>
);

/** Perk names exactly as they appear in the `perks` table, so filters match. */
const JOB_PERKS = ["Accommodation", "Feeding", "Transport Allowance", "Flexible Hours", "Remote Options", "Health Insurance"];

export function CampaignModule({ campaign }: { campaign: Campaign }) {
  switch (campaign.module) {
    case "commute":
      return (
        <>
          <h2 className={s.h2}>What your commute really costs</h2>
          <p className={s.lead}>
            Change the numbers to match your own trip. Transport comes out of your salary before rent, food or
            savings.
          </p>
          <CommuteCalculator />
          <h3 className={s.h3} style={{ marginTop: "2.5rem" }}>
            Filter jobs by the perks that cut your costs
          </h3>
          <Chips items={JOB_PERKS} label="Job perks you can filter by" />
        </>
      );

    case "lawyer":
      return (
        <>
          <h2 className={s.h2}>A profile clients can trust</h2>
          <div className={s.twoCol}>
            <div>
              <h3 className={s.h3}>Practice areas people search for</h3>
              <Chips
                label="Practice areas"
                items={[
                  "Property and land",
                  "Tenancy",
                  "Corporate and CAC",
                  "Family",
                  "Criminal defence",
                  "Employment",
                  "Debt recovery",
                  "Intellectual property",
                  "Wills and probate",
                ]}
              />
            </div>
            <div>
              <h3 className={s.h3}>What to put on your profile</h3>
              <Checks
                items={[
                  "Your year of call",
                  "Up to three practice areas, and more in your bio",
                  "The area your chambers is in",
                  "Languages you consult in",
                  "A clear, professional photo",
                ]}
              />
            </div>
          </div>
          <p className={s.callout}>
            Keep your profile factual. List what you do and where you are; don't promise results or compare yourself
            with other lawyers.
          </p>
        </>
      );

    case "nysc":
      return (
        <>
          <h2 className={s.h2}>Work that fits your service year</h2>
          <div className={s.twoCol}>
            <div>
              <h3 className={s.h3}>While you're serving</h3>
              <Checks
                items={[
                  "Weekend and evening gigs near where you stay",
                  "Part-time roles that fit around your PPA and CDS day",
                  "Tutoring, events and front-desk work",
                  "Remote work you can do from your phone or laptop",
                ]}
              />
            </div>
            <div>
              <h3 className={s.h3}>After you pass out</h3>
              <Checks
                items={[
                  "Graduate trainee and entry-level roles",
                  "Full-time jobs in the state you're serving in, if you want to stay",
                  "Roles that come with accommodation or feeding",
                ]}
              />
            </div>
          </div>
          <h3 className={s.h3} style={{ marginTop: "2.5rem" }}>
            Perks that help on a corper's allowance
          </h3>
          <Chips items={JOB_PERKS.slice(0, 5)} label="Job perks you can filter by" />
          <p className={s.callout}>
            Your service duties come first. Check that any job fits your PPA hours before you accept it.
          </p>
        </>
      );

    case "developer":
      return (
        <>
          <h2 className={s.h2}>Be the developer businesses can find</h2>
          <div className={s.twoCol}>
            <div>
              <h3 className={s.h3}>Work local businesses ask for</h3>
              <Checks
                items={[
                  "Websites for shops, schools, clinics and churches",
                  "Online stores with Paystack or Flutterwave checkout",
                  "Booking, inventory and staff tools",
                  "Fixing slow or broken WordPress sites",
                  "Mobile apps for delivery and logistics",
                ]}
              />
            </div>
            <div>
              <h3 className={s.h3}>What clients want to see</h3>
              <Checks
                items={[
                  "Your stack, in plain words",
                  "Two or three shipped projects with screenshots",
                  "Links to live work or your code",
                  "How you charge: per project or per month",
                  "How quickly you reply",
                ]}
              />
            </div>
          </div>
        </>
      );

    case "company":
      return (
        <>
          <h2 className={s.h2}>Job posts that get the right people</h2>
          <div className={s.twoCol}>
            <div>
              <h3 className={s.h3}>Include these and applicants trust the post</h3>
              <Checks
                items={[
                  "A clear job title",
                  "A salary range",
                  "The area of your workplace",
                  "Perks such as feeding or transport allowance",
                  "What applicants must send: CV, photo or ID",
                ]}
              />
            </div>
            <div>
              <h3 className={s.h3}>Perks candidates filter for</h3>
              <Chips items={JOB_PERKS} label="Job perks" />
            </div>
          </div>
        </>
      );

    case "client":
      return (
        <>
          <h2 className={s.h2}>Book with confidence</h2>
          <div className={s.twoCol}>
            <div>
              <h3 className={s.h3}>Popular services</h3>
              <Chips
                label="Popular services"
                items={["Plumbing", "Electrical", "AC repair", "Tailoring", "Makeup", "Hairdressing", "Photography", "Cleaning", "Legal help"]}
              />
            </div>
            <div>
              <h3 className={s.h3}>Before you book</h3>
              <Checks
                items={[
                  "Look for the verified badge",
                  "Check photos of their past work",
                  "Agree the price before work starts",
                ]}
              />
            </div>
          </div>
        </>
      );

    case "trade":
    default:
      return (
        <>
          <h2 className={s.h2}>What gets you picked</h2>
          <div className={s.twoCol}>
            <div>
              <h3 className={s.h3}>Profiles that get contacted have</h3>
              <Checks
                items={[
                  "A clear photo of your face",
                  "Three or more photos of finished work",
                  "Your area and how far you'll travel",
                  "Your usual price range in your bio",
                  "Quick replies to messages",
                ]}
              />
            </div>
            <div>
              <h3 className={s.h3}>Rank higher</h3>
              <Checks
                items={[
                  "Verify your identity with NIN and a selfie",
                  "Switch on “available now” when you can take work",
                  "Keep your location up to date",
                ]}
              />
            </div>
          </div>
        </>
      );
  }
}
