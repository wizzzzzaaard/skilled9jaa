/**
 * Niche landing pages ("campaigns").
 *
 * Each entry renders at skilled9ja.com/<slug> and pre-fills signup for that
 * audience. Today this lives in code; the shape mirrors the proposed
 * `campaign_pages` table so it can move to the database later without
 * touching the page components.
 */

export type Audience = "provider" | "job_seeker" | "client" | "company";

/** Which signup path the page opens. */
export type SignupRole = "artisan" | "home_service_provider" | "client" | "company";

export type CampaignModule =
  | "trade"
  | "lawyer"
  | "nysc"
  | "commute"
  | "developer"
  | "company"
  | "client";

export interface Faq {
  q: string;
  a: string;
}

export interface Campaign {
  slug: string;
  audience: Audience;
  role: SignupRole;
  /** Skill names (from `skills`) or home-service category names to pre-select. Max 3. */
  preselect: string[];
  seoTitle: string;
  seoDescription: string;
  headline: string;
  sub: string;
  /** Button text. Same words are used on every button on the page. */
  cta: string;
  formTitle: string;
  benefits: { title: string; body: string }[];
  steps: [string, string, string];
  module: CampaignModule;
  /** Examples drawn on the distance strip. Labelled as examples on the page. */
  nearby: { label: string; km: number }[];
  faq: Faq[];
  /** Small print under the page (affiliation or professional-rules notes). */
  note?: string;
  /** Show the live count of open jobs (job seekers only). */
  showOpenJobs?: boolean;
}

const commonProviderFaq: Faq[] = [
  {
    q: "Is it free to join?",
    a: "Yes. Creating your profile and appearing to people near you costs nothing. Paid options only add extra visibility.",
  },
  {
    q: "How do people near me find me?",
    a: "When someone searches for your skill, Skilled9ja shows the closest verified profiles first, using the location you set.",
  },
  {
    q: "Do I have to share my exact address?",
    a: "No. People see your area and distance, not your house address. You choose what contact details to show.",
  },
  {
    q: "What does verification involve?",
    a: "You confirm your identity with your NIN and a selfie. Verified profiles get a badge and rank higher.",
  },
];

const tradePage = (
  slug: string,
  trade: string,
  tradePlural: string,
  preselect: string[],
  nearby: { label: string; km: number }[],
  role: SignupRole = "artisan",
): Campaign => ({
  slug,
  audience: "provider",
  role,
  preselect,
  seoTitle: `${tradePlural}: get clients near you | Skilled9ja`,
  seoDescription: `Join Skilled9ja free and get found by people who need a ${trade.toLowerCase()} close to where you work.`,
  headline: `Get ${trade.toLowerCase()} jobs from people near you`,
  sub: `People around you search for a ${trade.toLowerCase()} every day. Put your profile where they look, and take jobs you can reach without a long trip.`,
  cta: "Create my free profile",
  formTitle: `Join as a ${trade.toLowerCase()}`,
  benefits: [
    { title: "Closest first", body: "Searches rank nearby pros above far-away ones, so short trips come to you." },
    { title: "Show your work", body: "Post photos of finished jobs. Clients decide faster when they can see your work." },
    { title: "Free to start", body: "No fee to join. Upgrade later only if you want more visibility." },
  ],
  steps: [
    "Create your free account",
    "Add your skills, area and a few photos of your work",
    "Get contacted by people close to you",
  ],
  module: "trade",
  nearby,
  faq: commonProviderFaq,
});

export const CAMPAIGNS: Campaign[] = [
  {
    ...tradePage("artisans", "Artisan", "Artisans", [], [
      { label: "Leaking pipe", km: 1.1 },
      { label: "Ceiling fan fix", km: 2.6 },
      { label: "Wardrobe repair", km: 4.2 },
      { label: "AC servicing", km: 7.5 },
    ]),
    headline: "Get jobs from people near you, whatever your trade",
    sub: "Plumbers, electricians, tailors, painters, mechanics and more. Put your profile where nearby clients look and take jobs you can reach quickly.",
    formTitle: "Join as an artisan",
  },
  tradePage("plumbers", "Plumber", "Plumbers", ["Plumbing"], [
    { label: "Burst pipe", km: 0.8 },
    { label: "Toilet installation", km: 2.3 },
    { label: "Borehole pump fix", km: 4.9 },
    { label: "New bathroom", km: 8.1 },
  ]),
  tradePage("electricians", "Electrician", "Electricians", ["Electrician"], [
    { label: "Socket keeps sparking", km: 1.4 },
    { label: "Inverter wiring", km: 3.0 },
    { label: "New house wiring", km: 5.6 },
    { label: "Prepaid meter issue", km: 7.9 },
  ]),
  tradePage("ac-technicians", "AC technician", "AC technicians", ["AC Technician"], [
    { label: "AC not cooling", km: 1.0 },
    { label: "Gas refill", km: 2.8 },
    { label: "Split unit install", km: 4.4 },
    { label: "Office AC servicing", km: 8.6 },
  ]),
  tradePage("tailors", "Tailor", "Tailors", ["Tailoring (Menswear)", "Tailoring (Womenswear)", "Tailor Alterations"], [
    { label: "Aso ebi for a wedding", km: 1.3 },
    { label: "Trouser adjustment", km: 2.1 },
    { label: "Senator outfit", km: 4.7 },
    { label: "School uniforms", km: 7.2 },
  ]),
  tradePage("painters", "Painter", "Painters", ["Painters"], [
    { label: "Two-bedroom repaint", km: 1.6 },
    { label: "Shop front", km: 3.3 },
    { label: "POP and screeding", km: 5.0 },
    { label: "Office repaint", km: 8.4 },
  ]),
  tradePage("web-designers", "Web designer", "Web designers", ["Web Design"], [
    { label: "Website for a pharmacy", km: 1.9 },
    { label: "Restaurant menu site", km: 3.7 },
    { label: "School website", km: 6.0 },
    { label: "Church website update", km: 9.2 },
  ]),
  tradePage("graphic-designers", "Graphic designer", "Graphic designers", ["Graphic Design"], [
    { label: "Logo for a bakery", km: 1.2 },
    { label: "Event flyers", km: 2.9 },
    { label: "Shop signboard", km: 5.4 },
    { label: "Product labels", km: 7.7 },
  ]),
  {
    ...tradePage("digital-creators", "Content creator", "Digital creators", ["Content Creator"], [
      { label: "Restaurant reels", km: 1.5 },
      { label: "Salon TikTok videos", km: 3.1 },
      { label: "Product shoot", km: 5.2 },
      { label: "Event coverage", km: 8.0 },
    ]),
    headline: "Get paid content work from businesses near you",
    sub: "Local shops, salons, restaurants and event planners need reels, photos and posts. Show your work where they look and get booked close to home.",
    formTitle: "Join as a digital creator",
  },
  tradePage("makeup-artists", "Makeup artist", "Makeup artists", ["Makeup"], [
    { label: "Bridal makeup", km: 1.7 },
    { label: "Birthday shoot", km: 3.4 },
    { label: "Owambe party", km: 5.8 },
    { label: "Corporate event", km: 8.9 },
  ], "home_service_provider"),
  tradePage("hairstylists", "Hairstylist", "Hairstylists", ["Hairdressing"], [
    { label: "Knotless braids", km: 0.9 },
    { label: "Wig install", km: 2.5 },
    { label: "Bridal hair", km: 4.6 },
    { label: "Kids' cornrows", km: 6.8 },
  ], "home_service_provider"),
  tradePage("photographers", "Photographer", "Photographers", ["Photographer"], [
    { label: "Birthday shoot", km: 1.8 },
    { label: "Product photos", km: 3.2 },
    { label: "Wedding coverage", km: 6.1 },
    { label: "Graduation portraits", km: 8.3 },
  ], "home_service_provider"),

  {
    slug: "lawyers",
    audience: "provider",
    role: "artisan",
    preselect: ["Lawyer (Property)", "Lawyer (Corporate)", "Lawyer (Family)"],
    seoTitle: "Lawyers: be found by clients near your chambers | Skilled9ja",
    seoDescription:
      "Join Skilled9ja free. List your practice areas and location so individuals and businesses nearby can find and contact you.",
    headline: "Be the lawyer people nearby find when they need one",
    sub: "Tenants, landlords, small businesses and families search for legal help close to home. List your practice areas and location so they can reach your chambers directly.",
    cta: "Create my free profile",
    formTitle: "Join as a lawyer",
    benefits: [
      { title: "Clients near your chambers", body: "People see lawyers closest to them first, so walk-in-distance briefs reach you." },
      { title: "Facts, not adverts", body: "Your profile lists your call year, practice areas and location. Nothing more." },
      { title: "Company roles too", body: "Firms and companies post in-house and legal counsel roles you can apply for." },
    ],
    steps: [
      "Create your free account",
      "Add your call year, practice areas and chambers location",
      "Receive enquiries and apply for legal roles nearby",
    ],
    module: "lawyer",
    nearby: [
      { label: "Tenancy agreement review", km: 1.2 },
      { label: "CAC registration", km: 2.7 },
      { label: "Land title search", km: 4.8 },
      { label: "Legal counsel role", km: 7.6 },
    ],
    faq: [
      {
        q: "Is a profile here consistent with the Rules of Professional Conduct?",
        a: "Your profile shows factual information you provide: name, year of call, practice areas and location. It does not promise outcomes or compare you with other lawyers. You remain responsible for what you publish.",
      },
      {
        q: "Who contacts me?",
        a: "Individuals and businesses looking for help in your practice areas, and companies hiring legal staff.",
      },
      {
        q: "Is it free?",
        a: "Yes. Joining and appearing in search is free.",
      },
      {
        q: "Can I list more than one practice area?",
        a: "Yes. Pick up to three when you sign up and describe the rest in your profile.",
      },
    ],
    note: "Skilled9ja is a directory and jobs platform. It does not give legal advice, and it is not a law firm.",
  },

  {
    slug: "nysc",
    audience: "job_seeker",
    role: "artisan",
    preselect: [],
    seoTitle: "Corps members: find work near your PPA | Skilled9ja",
    seoDescription:
      "Find jobs and paid gigs close to where you are posted, filter for accommodation and feeding, and line up a job before you pass out.",
    headline: "Find work near where you're posted, and a job before you pass out",
    sub: "New state, new city, small allowance. See jobs and paid gigs close to your PPA, filter for accommodation and feeding, and apply from your phone.",
    cta: "Create my free profile",
    formTitle: "Join as a corps member",
    benefits: [
      { title: "Close to your PPA", body: "See employers closest to where you stay and jobs in your state, so your allowance doesn't go on transport." },
      { title: "Perks that matter", body: "Filter for accommodation, feeding and transport allowance." },
      { title: "Ready for after POP", body: "Build your profile now and apply for full-time roles that start after service." },
    ],
    steps: [
      "Create your free account with your state of deployment",
      "Add your course, skills and the days you're free",
      "Apply for jobs and gigs near you",
    ],
    module: "nysc",
    nearby: [
      { label: "Weekend tutoring", km: 0.9 },
      { label: "Front desk, part-time", km: 2.4 },
      { label: "Data entry contract", km: 4.1 },
      { label: "Graduate trainee, after POP", km: 6.9 },
    ],
    faq: [
      {
        q: "Will this clash with my PPA or CDS?",
        a: "You choose which jobs to apply for. Filter by part-time, weekend or contract work that fits around your service duties.",
      },
      {
        q: "I've just been posted to a new state. Does that work?",
        a: "Yes. Set your location to where you stay now. Employers are sorted by distance from there, and jobs are filtered to your state.",
      },
      {
        q: "Is it free for corps members?",
        a: "Yes. Creating a profile and applying is free.",
      },
      {
        q: "What should I add to my profile?",
        a: "Your course, the skills you can use at work, a clear photo and the days you're available.",
      },
    ],
    note: "Skilled9ja is not affiliated with the National Youth Service Corps.",
    showOpenJobs: true,
  },

  {
    slug: "jobs-near-me",
    audience: "job_seeker",
    role: "artisan",
    preselect: [],
    seoTitle: "Jobs near you: keep more of your salary | Skilled9ja",
    seoDescription:
      "A job close to home saves transport money and hours in traffic every month. Find employers near you and apply free.",
    headline: "A job close to home pays you more",
    sub: "Transport eats a big slice of every salary. Find employers close to where you live, and keep the money you would have spent getting there.",
    cta: "Find jobs near me",
    formTitle: "Create your free job profile",
    benefits: [
      { title: "Employers near you first", body: "See companies hiring around you, sorted by distance, and jobs in your city." },
      { title: "See the real pay", body: "Salary ranges and perks like transport allowance and feeding are on the listing." },
      { title: "Apply in one tap", body: "Your profile is your application. No printing, no long forms." },
    ],
    steps: [
      "Create your free account",
      "Set where you live and the kind of work you want",
      "Apply to jobs within reach",
    ],
    module: "commute",
    nearby: [
      { label: "Shop attendant", km: 0.7 },
      { label: "Receptionist", km: 1.9 },
      { label: "Driver", km: 3.8 },
      { label: "Accountant", km: 6.4 },
    ],
    faq: [
      {
        q: "How do you know which jobs are near me?",
        a: "You set your location once. Companies hiring are sorted by distance from you, and job listings are filtered to your state and city.",
      },
      {
        q: "Is it free to apply?",
        a: "Yes. Creating a profile and applying is free.",
      },
      {
        q: "Are the numbers in the calculator real?",
        a: "They're examples. Put in your own fare, salary and travel time to see what your commute costs you.",
      },
      {
        q: "Can I still apply for jobs far away?",
        a: "Yes. Distance only changes the order. You can browse and apply anywhere.",
      },
    ],
    showOpenJobs: true,
  },

  {
    slug: "developers",
    audience: "provider",
    role: "artisan",
    preselect: ["Fullstack Developer", "Frontend Developer", "Mobile App Developer"],
    seoTitle: "Developers: get clients and contracts | Skilled9ja",
    seoDescription:
      "Join Skilled9ja free. Show your projects and get found by businesses near you and remote clients looking for developers.",
    headline: "Get development work from businesses that can find you",
    sub: "Pharmacies, schools, shops and startups need websites, apps and fixes, and many want someone they can meet. Show your projects and get found by clients nearby or remote.",
    cta: "Create my free profile",
    formTitle: "Join as a developer",
    benefits: [
      { title: "Local and remote", body: "Appear to businesses in your area and to clients hiring remotely." },
      { title: "Your work up front", body: "Post screenshots of shipped projects and link your live work." },
      { title: "Contracts and roles", body: "Apply for freelance, contract and full-time developer jobs." },
    ],
    steps: [
      "Create your free account",
      "Add your stack and two or three projects",
      "Get contacted by clients and apply for contracts",
    ],
    module: "developer",
    nearby: [
      { label: "Pharmacy website", km: 1.3 },
      { label: "Fix a slow WordPress site", km: 2.9 },
      { label: "School results portal", km: 5.3 },
      { label: "Logistics mobile app", km: 9.0 },
    ],
    faq: [
      ...commonProviderFaq.slice(0, 1),
      {
        q: "Can I work with clients outside my city?",
        a: "Yes. Say in your profile that you take remote work. Remote clients and remote jobs are listed too.",
      },
      {
        q: "What should my profile show?",
        a: "Your stack, two or three projects with screenshots, and links to live work or code.",
      },
      commonProviderFaq[3],
    ],
  },

  {
    slug: "hire",
    audience: "company",
    role: "company",
    preselect: [],
    seoTitle: "Hire staff who live near your business | Skilled9ja",
    seoDescription:
      "Post a job free and reach candidates who live close to your workplace.",
    headline: "Hire people who live close to your business",
    sub: "Post a job and reach candidates in your city, and browse people who live close to your workplace. Shorter commutes mean staff who arrive on time.",
    cta: "Post my first job free",
    formTitle: "Create your company account",
    benefits: [
      { title: "Nearby candidates", body: "Browse job seekers sorted by how close they live to your workplace." },
      { title: "One inbox", body: "Review applications, shortlist and accept from one page." },
      { title: "First job free", body: "Post your first job at no cost." },
    ],
    steps: [
      "Create your company account",
      "Post the role with salary range and perks",
      "Review applicants who live nearby",
    ],
    module: "company",
    nearby: [
      { label: "Applicant, cashier", km: 0.8 },
      { label: "Applicant, driver", km: 2.2 },
      { label: "Applicant, accountant", km: 4.0 },
      { label: "Applicant, sales rep", km: 6.5 },
    ],
    faq: [
      { q: "How much does it cost to post a job?", a: "Your first job post is free." },
      {
        q: "Who sees my job?",
        a: "Job seekers looking for work in your state and city.",
      },
      {
        q: "Can I ask for a CV or ID?",
        a: "Yes. Choose what applicants must include when you post the job.",
      },
      {
        q: "Can several people from my company use it?",
        a: "One account per company for now. Shared team access is planned.",
      },
    ],
  },

  {
    slug: "hire-a-pro",
    audience: "client",
    role: "client",
    preselect: [],
    seoTitle: "Find a trusted pro near you | Skilled9ja",
    seoDescription:
      "Find verified plumbers, electricians, tailors, makeup artists and more close to you. Free for clients.",
    headline: "Find a verified pro close to you",
    sub: "Plumbers, electricians, tailors, makeup artists, lawyers and more, sorted by how near they are. Free for you to use.",
    cta: "Find a pro near me",
    formTitle: "Create your free account",
    benefits: [
      { title: "Nearest first", body: "See pros close to you, with their distance and past work." },
      { title: "Verified badge", body: "Look for pros who have confirmed their identity with NIN and a selfie." },
      { title: "Free for clients", body: "Searching and contacting pros costs you nothing." },
    ],
    steps: [
      "Create your free account",
      "Search for the service you need",
      "Contact a pro near you",
    ],
    module: "client",
    nearby: [
      { label: "Plumber", km: 0.9 },
      { label: "Electrician", km: 1.8 },
      { label: "Tailor", km: 3.5 },
      { label: "Makeup artist", km: 5.7 },
    ],
    faq: [
      { q: "Is it free?", a: "Yes. Clients never pay to search or contact pros." },
      {
        q: "How do I know a pro is genuine?",
        a: "Verified pros have confirmed their identity with NIN and a selfie. You can also see photos of their past work.",
      },
      {
        q: "Do I pay the pro through Skilled9ja?",
        a: "You agree the price with the pro directly.",
      },
    ],
  },
];

export const CAMPAIGN_SLUGS = CAMPAIGNS.map((c) => c.slug);

export function getCampaign(slug: string): Campaign | undefined {
  return CAMPAIGNS.find((c) => c.slug === slug);
}

export function isCampaignPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const first = pathname.split("/")[1] ?? "";
  return CAMPAIGN_SLUGS.includes(first);
}

/** Marketing channels the admin can copy a tracked link for. */
export const CAMPAIGN_CHANNELS = [
  { key: "whatsapp", label: "WhatsApp", medium: "social" },
  { key: "instagram", label: "Instagram", medium: "social" },
  { key: "facebook", label: "Facebook", medium: "paid_social" },
  { key: "tiktok", label: "TikTok", medium: "paid_social" },
  { key: "x", label: "X (Twitter)", medium: "social" },
  { key: "flyer", label: "Flyer / QR", medium: "offline" },
] as const;

export function campaignUrl(origin: string, slug: string, channel?: string, medium?: string): string {
  const url = new URL(`/${slug}`, origin);
  if (channel) {
    url.searchParams.set("utm_source", channel);
    url.searchParams.set("utm_medium", medium ?? "social");
    url.searchParams.set("utm_campaign", slug);
  }
  return url.toString();
}
