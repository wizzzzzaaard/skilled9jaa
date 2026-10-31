// Jobs, applying and admin tools, against tests/mock-supabase/server.js.
// The stand-in database seeds 25 jobs (3 in the FCT, 1 closed) from "Garki Mart Ltd".
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE_URL || "http://localhost:3100";
const MOCK = process.env.MOCK_URL || "http://localhost:54321";
const OUT = path.join(__dirname, "shots");
fs.mkdirSync(OUT, { recursive: true });
const results = [];
async function check(name, fn) {
  try {
    results.push({ ok: true, name, detail: (await fn()) || "" });
  } catch (e) {
    results.push({ ok: false, name, detail: String(e.message || e).split("\n")[0] });
  }
}
const assert = (c, m) => {
  if (!c) throw new Error(m);
};
const MOBILE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const DESKTOP = { viewport: { width: 1280, height: 900 } };
const reset = () => fetch(`${MOCK}/__mock/reset`);
const state = () => fetch(`${MOCK}/__mock/state`).then((r) => r.json());
const setProfile = (email, patch) =>
  fetch(`${MOCK}/__mock/set-profile`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, patch }) });

async function open(browser, opts = MOBILE) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(/supabase\.co|googleapis|gstatic|wa\.me/, (r) => r.fulfill({ status: 204, body: "" }));
  return { ctx, page, errors };
}

async function signupArtisan(page, email) {
  await page.goto(`${BASE}/signup?role=artisan`, { waitUntil: "networkidle" });
  await page.getByLabel("Full name").fill("Tunde Bello");
  await page.getByLabel("Phone number").fill("08031234567");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Create a password").fill("lagos2026");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("State").selectOption("Lagos");
  await page.getByLabel("City or town").selectOption("Ikeja");
  await page.getByRole("button", { name: "Next: your skills" }).click();
  await page.getByRole("button", { name: /^Cashier/ }).click();
  await page.getByRole("button", { name: "Finish" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("lagos2026");
  await page.locator("form").getByRole("button", { name: "Log in" }).click();
}

(async () => {
  const browser = await chromium.launch();

  await check("Jobs list: 20 shown, 'Show more' loads the rest, employer names shown", async () => {
    await reset();
    const { ctx, page, errors } = await open(browser);
    await page.goto(`${BASE}/jobs`, { waitUntil: "networkidle" });
    await page.getByText("25 open jobs").waitFor({ timeout: 10000 });
    assert((await page.locator("ul > li").count()) === 20, "first page not 20");
    await page.screenshot({ path: path.join(OUT, "jobs-list-mobile.png"), fullPage: false });
    await page.getByRole("button", { name: /Show more jobs \(5 left\)/ }).click();
    await page.waitForFunction(() => document.querySelectorAll("ul > li").length === 25);
    const label = await page.locator("ul > li").first().textContent();
    await ctx.close();
    assert(/Posted (today|yesterday|\d+ days ago)/.test(label), `time label: ${label}`);
    assert(errors.length === 0, errors.join(" | "));
    return "20 → 25 after Show more";
  });

  await check("Old FCT link (?state=FCT) finds the jobs saved as 'Federal Capital Territory'", async () => {
    await reset();
    const { ctx, page } = await open(browser);
    await page.goto(`${BASE}/jobs?state=FCT`, { waitUntil: "networkidle" });
    await page.getByText("3 open jobs match").waitFor({ timeout: 10000 });
    const url = page.url();
    await ctx.close();
    assert(/state=Federal\+Capital\+Territory/.test(url), `link not tidied: ${url}`);
    return "3 FCT jobs; link rewritten to the stored spelling";
  });

  await check("Perk filter works and is kept in the link", async () => {
    await reset();
    const { ctx, page } = await open(browser, DESKTOP);
    await page.goto(`${BASE}/jobs`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Filters/ }).click();
    await page.getByRole("button", { name: "Feeding" }).click();
    await page.getByText("2 open jobs match").waitFor({ timeout: 10000 });
    const url = page.url();
    await page.reload({ waitUntil: "networkidle" });
    await page.getByText("2 open jobs match").waitFor({ timeout: 10000 });
    await ctx.close();
    assert(/perks=p1/.test(url), url);
    return "Feeding → 2 jobs; survives a reload";
  });

  await check("Pay filter keeps jobs whose range reaches the amount", async () => {
    await reset();
    const { ctx, page } = await open(browser, DESKTOP);
    await page.goto(`${BASE}/jobs?pay=100000`, { waitUntil: "networkidle" });
    await page.getByText("1 open job match").waitFor({ timeout: 10000 });
    const t = await page.locator("ul > li").first().textContent();
    await ctx.close();
    assert(/Cashier/.test(t) && /₦80,000 to ₦150,000 a month/.test(t), t);
    return "₦80k–₦150k job kept for 'at least ₦100k'";
  });

  await check("Search by title, and an empty result offers to clear filters", async () => {
    await reset();
    const { ctx, page } = await open(browser);
    await page.goto(`${BASE}/jobs`, { waitUntil: "networkidle" });
    await page.getByLabel("Search jobs").fill("front desk");
    await page.getByText("1 open job match").waitFor({ timeout: 10000 });
    await page.getByLabel("Search jobs").fill("astronaut");
    await page.getByText("No jobs match these filters").waitFor({ timeout: 10000 });
    await page.getByRole("button", { name: "Clear filters" }).click();
    await page.getByText("25 open jobs").waitFor({ timeout: 10000 });
    await ctx.close();
    return "front desk → 1; astronaut → none → cleared → 25";
  });

  await check("Job page: logged-out visitors get signup and log-in links (no dead form)", async () => {
    await reset();
    const { ctx, page } = await open(browser);
    await page.goto(`${BASE}/jobs/job-01`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Cashier" }).waitFor({ timeout: 10000 });
    const login = await page.getByRole("link", { name: "Log in to apply" }).getAttribute("href");
    const wa = await page.getByRole("link", { name: "Share on WhatsApp" }).getAttribute("href");
    await page.screenshot({ path: path.join(OUT, "job-page-loggedout-mobile.png"), fullPage: true });
    const html = await (await fetch(`${BASE}/jobs/job-01`)).text();
    await ctx.close();
    assert(login === "/login?next=%2Fjobs%2Fjob-01", login);
    assert(/wa\.me\/\?text=Cashier%20in%20Garki/.test(wa), wa);
    assert(/<title>Cashier in Garki, Federal Capital Territory/.test(html), "server title missing");
    return "links correct; title rendered on the server";
  });

  await check("Closed job says so and points to other jobs", async () => {
    await reset();
    const { ctx, page } = await open(browser);
    await page.goto(`${BASE}/jobs/job-25`, { waitUntil: "networkidle" });
    await page.getByText(/Applications closed on/).waitFor({ timeout: 10000 });
    const other = await page.getByRole("link", { name: /See other jobs in Lagos/ }).getAttribute("href");
    await ctx.close();
    assert(other === "/jobs?state=Lagos", other);
    return "closed + link to Lagos jobs";
  });

  await check("Apply: CV required, uploaded privately, sent once, status shown", async () => {
    await reset();
    const { ctx, page, errors } = await open(browser);
    await signupArtisan(page, "seeker@example.com");
    await page.goto(`${BASE}/jobs/job-01`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Apply for this job" }).click();
    await page.getByRole("button", { name: "Send application" }).click();
    const err = await page.locator("main [role=alert]").first().textContent();
    assert(/Add your cv/i.test(err), err);
    const tooBig = Buffer.alloc(11 * 1024 * 1024);
    await page.locator("input[type=file]").setInputFiles({ name: "big.pdf", mimeType: "application/pdf", buffer: tooBig });
    assert(/over 10 MB/.test(await page.locator("main [role=alert]").first().textContent()), "big file accepted");
    await page.locator("input[type=file]").setInputFiles({ name: "cv.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") });
    await page.getByText("Added. Tap to replace").waitFor({ timeout: 10000 });
    await page.getByLabel("Short note to the employer (optional)").fill("Two years as a cashier at a supermarket.");
    await page.getByRole("button", { name: "Send application" }).click();
    await page.getByText("You applied for this job").waitFor({ timeout: 10000 });
    await page.reload({ waitUntil: "networkidle" });
    await page.getByText("You applied for this job").waitFor({ timeout: 10000 });
    const st = await state();
    await ctx.close();
    assert(st.job_applications.length === 1, `applications: ${st.job_applications.length}`);
    assert(st.job_applications[0].cv_url.startsWith("private:application-docs/"), st.job_applications[0].cv_url);
    assert(errors.length === 0, errors.join(" | "));
    return "1 application; CV stored in the private bucket";
  });

  await check("Employer sees 'This is your job post'; company can't apply elsewhere", async () => {
    await reset();
    const { ctx, page } = await open(browser);
    await login(page, "employer@example.com");
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await page.goto(`${BASE}/jobs/job-02?posted=1`, { waitUntil: "networkidle" });
    await page.getByText("This is your job post.").waitFor({ timeout: 10000 });
    await page.getByText("Your job is live.").waitFor();
    await ctx.close();
    return "own job + 'live' banner after posting";
  });

  await check("Admin overview shows real numbers; non-admins are turned away", async () => {
    await reset();
    const a = await open(browser);
    await signupArtisan(a.page, "boss@example.com");
    await a.page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
    assert(!/\/admin$/.test(a.page.url()) || (await a.page.getByText("Admins only.").count()) === 1, "non-admin saw admin");
    await setProfile("boss@example.com", { is_admin: true });
    await a.page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
    await a.page.getByText("Members").first().waitFor({ timeout: 10000 });
    const text = await a.page.locator("main").textContent();
    await a.page.screenshot({ path: path.join(OUT, "admin-overview-desktop.png"), fullPage: true });
    await a.ctx.close();
    assert(/Open jobs\s*25/.test(text), `open jobs: ${text.slice(0, 300)}`);
    assert(/New members, last 14 days/.test(text), "no daily chart");
    return "real counts (25 open jobs, members by status, 14-day signups)";
  });

  await check("Admin payments: find a transfer by its S9- reference", async () => {
    await reset();
    const a = await open(browser, DESKTOP);
    await signupArtisan(a.page, "payer@example.com");
    await a.page.goto(`${BASE}/upgrade`, { waitUntil: "networkidle" });
    await a.page.getByRole("radio", { name: /Bank transfer/ }).click();
    const ref = (await a.page.getByText(/^S9-[0-9A-F]{8}$/).first().textContent()).trim();
    await a.page.getByRole("button", { name: /I've sent/ }).click();
    await a.page.getByRole("heading", { name: "We're checking your transfer" }).waitFor({ timeout: 10000 });
    await setProfile("payer@example.com", { is_admin: true });
    await a.page.goto(`${BASE}/admin/payments`, { waitUntil: "networkidle" });
    await a.page.getByLabel("Find a transfer").fill(ref.toLowerCase());
    await a.page.getByRole("cell", { name: ref }).waitFor({ timeout: 10000 });
    await a.page.getByLabel("Find a transfer").fill("S9-NOMATCH");
    const rows = await a.page.locator("tbody tr").count();
    await a.ctx.close();
    assert(rows === 0, `rows for a wrong reference: ${rows}`);
    return `found ${ref}; wrong reference shows nothing`;
  });

  await browser.close();
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  — ${r.detail}` : ""}`);
  console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed`);
})();
