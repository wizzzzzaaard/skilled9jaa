// End-to-end signup and payment tests against tests/mock-supabase/server.js.
// Each test resets the stand-in database, then walks the real screens.
const { chromium } = require("playwright");
let AxeBuilder = null;
try {
  ({ AxeBuilder } = require("@axe-core/playwright"));
} catch {
  /* accessibility checks skipped when the package is missing */
}
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE_URL || "http://localhost:3100";
const MOCK = process.env.MOCK_URL || "http://localhost:54321";
const OUT = path.join(__dirname, "shots");
fs.mkdirSync(OUT, { recursive: true });

const results = [];
async function check(name, fn) {
  try {
    const d = await fn();
    results.push({ ok: true, name, detail: d || "" });
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

async function newPage(browser, opts = MOBILE) {
  const ctx = await browser.newContext({ ...opts, geolocation: { latitude: 6.6018, longitude: 3.3515 }, permissions: ["geolocation"] });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // External calls the sandbox can't make (logo, Paystack) are answered locally.
  await page.route(/supabase\.co|googleapis|gstatic/, (r) => r.fulfill({ status: 204, body: "" }));
  return { ctx, page, errors };
}

async function fillAccount(page, o = {}) {
  await page.getByLabel("Full name").or(page.getByLabel("Your full name")).fill(o.name ?? "Ada Okafor");
  await page.getByLabel("Phone number").fill(o.phone ?? "0803 123 4567");
  await page.getByLabel("Email").fill(o.email ?? "ada@example.com");
  await page.getByLabel("Create a password").fill(o.password ?? "lagos2026");
  if (o.consent !== false) await page.getByRole("checkbox").check();
}

(async () => {
  const browser = await chromium.launch();

  await check("Artisan: role → account → profile → skills → dashboard, every answer saved", async () => {
    await reset();
    const { ctx, page, errors } = await newPage(browser);
    await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
    assert((await page.getByText("one-time payment").count()) === 0, "old payment claim still shown");
    await page.screenshot({ path: path.join(OUT, "signup-1-role-mobile.png"), fullPage: true });

    // Continue without choosing → message
    await page.getByRole("button", { name: "Continue" }).click();
    assert(/Choose what you want to do/.test(await page.locator("main [role=alert]").first().textContent()), "no prompt to choose");

    await page.getByRole("radio", { name: /Find work or clients/ }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByText("Step 2 of 4").waitFor();

    // Empty submit → errors, focus on full name
    await page.getByRole("button", { name: "Create account" }).click();
    const errs = await page.locator("[id^=acc-][id$=-err]").count();
    assert(errs === 5, `expected 5 errors, got ${errs}`);
    assert((await page.evaluate(() => document.activeElement?.id)) === "acc-fullName", "focus not on full name");

    // Back keeps the chosen role
    await page.getByRole("button", { name: "Back" }).click();
    assert((await page.getByRole("radio", { name: /Find work or clients/ }).getAttribute("aria-checked")) === "true", "role lost on back");
    await page.getByRole("button", { name: "Continue" }).click();

    await fillAccount(page);
    await page.screenshot({ path: path.join(OUT, "signup-2-account-mobile.png"), fullPage: true });
    await page.getByRole("button", { name: "Create account" }).click();
    await page.getByText("Step 3 of 4").waitFor({ timeout: 10000 });
    assert((await page.getByRole("button", { name: "Back" }).count()) === 0, "Back shown after account was created");

    // Location: GPS + state + city
    await page.getByRole("button", { name: "Use my current location" }).click();
    await page.getByText("Location set").waitFor();
    await page.getByRole("button", { name: "Next: your skills" }).click();
    assert(/Choose your state/.test(await page.locator("#setup-state-err").textContent()), "state not required");
    await page.getByLabel("State").selectOption("Lagos");
    await page.getByLabel("City or town").selectOption("Ikeja");
    await page.getByLabel("Local government area (optional)").selectOption("Ikeja");
    await page.getByLabel("Short bio (optional)").fill("Electrician in Ikeja, 6 years.");
    await page.screenshot({ path: path.join(OUT, "signup-3-profile-mobile.png"), fullPage: true });
    await page.getByRole("button", { name: "Next: your skills" }).click();
    await page.getByText("Step 4 of 4").waitFor({ timeout: 10000 });

    // Skills: none → error; search; limit 3
    await page.getByRole("button", { name: "Finish" }).click();
    assert(/Pick at least one/.test(await page.locator("main [role=alert]").first().textContent()), "no skill error");
    await page.getByLabel("Search").fill("plumb");
    await page.getByRole("button", { name: /^Plumbing/ }).click();
    await page.getByLabel("Search").fill("");
    await page.getByRole("button", { name: /^Electrician/ }).click();
    await page.getByRole("button", { name: /^Web Design/ }).click();
    const disabled = await page.getByRole("button", { name: /^Cashier/ }).isDisabled();
    assert(disabled, "a 4th skill could be picked");
    await page.screenshot({ path: path.join(OUT, "signup-4-skills-mobile.png"), fullPage: true });
    await page.getByRole("button", { name: "Finish" }).click();
    await page.waitForURL(/\/dashboard\?welcome=1/, { timeout: 15000 });

    const st = await state();
    const p = st.profiles[0];
    await ctx.close();
    assert(p.account_status === "active", `status ${p.account_status}`);
    assert(p.is_artisan && p.active_mode === "artisan", "role not saved");
    assert(p.phone_number === "+2348031234567", `phone ${p.phone_number}`);
    assert(p.state === "Lagos" && p.city === "Ikeja" && p.lga === "Ikeja", "location not saved");
    assert(Math.abs(p.latitude - 6.6018) < 0.001, "GPS not saved");
    assert(st.user_skills.length === 3, `skills saved: ${st.user_skills.length}`);
    assert(errors.length === 0, errors.join(" | "));
    return "active artisan with phone, GPS, Lagos/Ikeja and 3 skills";
  });

  await check("Niche link (/signup?role=artisan&niche=lawyers) skips role and pre-picks lawyer skills", async () => {
    await reset();
    const { ctx, page } = await newPage(browser, DESKTOP);
    await page.goto(`${BASE}/signup?role=artisan&niche=lawyers`, { waitUntil: "networkidle" });
    await page.getByText("Step 2 of 4").waitFor();
    assert((await page.getByRole("button", { name: "Back" }).count()) === 0, "Back shown though role came from the link");
    await fillAccount(page, { email: "lawyer@example.com" });
    await page.getByRole("button", { name: "Create account" }).click();
    await page.getByLabel("State").selectOption("Federal Capital Territory");
    await page.getByLabel("City or town").selectOption("Garki");
    await page.getByRole("button", { name: "Next: your skills" }).click();
    await page.getByText("3 of 3 chosen").waitFor({ timeout: 10000 });
    const chosen = await page.getByRole("list", { name: "Chosen" }).textContent();
    await page.screenshot({ path: path.join(OUT, "signup-lawyer-skills-desktop.png"), fullPage: true });
    await ctx.close();
    assert(/Lawyer \(Property\)/.test(chosen) && /Lawyer \(Corporate\)/.test(chosen), chosen);
    const st = await state();
    assert(st.profiles[0].state === "Federal Capital Territory", `state ${st.profiles[0].state}`);
    return "3 lawyer skills pre-picked; FCT saved with one spelling";
  });

  await check("Company: name required, finishes without a skills step", async () => {
    await reset();
    const { ctx, page } = await newPage(browser);
    await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
    await page.getByRole("radio", { name: /Hire staff/ }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByText("Step 2 of 3").waitFor();
    await fillAccount(page, { email: "boss@example.com" });
    await page.getByRole("button", { name: "Create account" }).click();
    await page.getByRole("heading", { name: "About your company" }).waitFor({ timeout: 10000 });
    await page.getByLabel("State").selectOption("Lagos");
    await page.getByLabel("City or town").selectOption("Yaba");
    await page.getByRole("button", { name: "Finish" }).click();
    assert(/company name/.test(await page.locator("#setup-companyName-err").textContent()), "company name not required");
    assert((await page.evaluate(() => document.activeElement?.id)) === "setup-companyName", "focus not moved");
    await page.getByLabel("Company name").fill("Ada Pharmacy Ltd");
    await page.getByRole("button", { name: "Finish" }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    const p = (await state()).profiles[0];
    await ctx.close();
    assert(p.is_company && p.company_name === "Ada Pharmacy Ltd" && p.account_status === "active", JSON.stringify(p).slice(0, 120));
    return "company active with name saved";
  });

  await check("Home service: services saved, then straight in (free signup)", async () => {
    await reset();
    const { ctx, page } = await newPage(browser);
    await page.goto(`${BASE}/signup?mode=homeservice`, { waitUntil: "networkidle" });
    await fillAccount(page, { email: "mua@example.com" });
    await page.getByRole("button", { name: "Create account" }).click();
    await page.getByLabel("State").selectOption("Lagos");
    await page.getByLabel("City or town").selectOption("Lekki");
    await page.getByRole("button", { name: "Next: your services" }).click();
    await page.getByRole("button", { name: "Makeup" }).click();
    await page.getByRole("button", { name: "Photographer" }).click();
    await page.getByRole("button", { name: "Finish" }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    const st = await state();
    await ctx.close();
    assert(st.provider_service_options.length === 2, `services saved: ${st.provider_service_options.length}`);
    assert(st.profiles[0].is_home_service_provider && st.profiles[0].account_status === "active", "not active home-service provider");
    return "2 services saved; active";
  });

  await check("Client: city typed by hand when not in the list", async () => {
    await reset();
    const { ctx, page } = await newPage(browser);
    await page.goto(`${BASE}/signup?role=client`, { waitUntil: "networkidle" });
    await fillAccount(page, { email: "client@example.com" });
    await page.getByRole("button", { name: "Create account" }).click();
    await page.getByRole("heading", { name: "Where are you?" }).waitFor({ timeout: 10000 });
    await page.getByLabel("State").selectOption("Oyo");
    await page.getByRole("button", { name: "Not listed?" }).click();
    await page.getByLabel("City or town").fill("Igboho");
    await page.getByRole("button", { name: "Finish" }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    const p = (await state()).profiles[0];
    await ctx.close();
    assert(p.city === "Igboho" && p.account_status === "active", `${p.city} ${p.account_status}`);
    return "typed town saved";
  });

  await check("Duplicate email shows 'already has an account' with a Log in link", async () => {
    await reset();
    const { ctx, page } = await newPage(browser);
    await page.goto(`${BASE}/signup?role=client`, { waitUntil: "networkidle" });
    await fillAccount(page, { email: "dup@example.com" });
    await page.getByRole("button", { name: "Create account" }).click();
    await page.getByRole("heading", { name: "Where are you?" }).waitFor({ timeout: 10000 });
    await ctx.close();
    const second = await newPage(browser);
    await second.page.goto(`${BASE}/signup?role=client`, { waitUntil: "networkidle" });
    await fillAccount(second.page, { email: "dup@example.com" });
    await second.page.getByRole("button", { name: "Create account" }).click();
    const alert = second.page.locator("form [role=alert]");
    await alert.waitFor({ timeout: 10000 });
    const t = await alert.textContent();
    const login = await alert.getByRole("link", { name: "Log in instead" }).count();
    await second.ctx.close();
    assert(/already has an account/.test(t) && login === 1, t);
    return t.trim();
  });

  await check("Leaving after the account step and logging back in resumes at the profile step", async () => {
    await reset();
    const a = await newPage(browser);
    await a.page.goto(`${BASE}/signup?role=artisan`, { waitUntil: "networkidle" });
    await fillAccount(a.page, { email: "resume@example.com" });
    await a.page.getByRole("button", { name: "Create account" }).click();
    await a.page.getByText("Step 3 of 4").waitFor({ timeout: 10000 });
    await a.ctx.close();

    const b = await newPage(browser);
    await b.page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await b.page.getByLabel("Email").fill("resume@example.com");
    await b.page.getByLabel("Password").fill("lagos2026");
    await b.page.locator("form").getByRole("button", { name: "Log in" }).click();
    await b.page.waitForURL(/\/signup\?resume=true&step=3/, { timeout: 15000 });
    await b.page.getByRole("heading", { name: "Set up your profile" }).waitFor({ timeout: 10000 });
    await b.ctx.close();
    return "login → /signup?resume=true&step=3 → profile step";
  });

  await check("Old 'pending payment' account gets straight in with free signup", async () => {
    await reset();
    const a = await newPage(browser);
    await a.page.goto(`${BASE}/signup?role=artisan`, { waitUntil: "networkidle" });
    await fillAccount(a.page, { email: "stuck@example.com" });
    await a.page.getByRole("button", { name: "Create account" }).click();
    await a.page.getByText("Step 3 of 4").waitFor({ timeout: 10000 });
    await a.ctx.close();
    await fetch(`${MOCK}/__mock/set-profile`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "stuck@example.com", patch: { account_status: "pending_payment", signup_step: 5 } }) });

    const b = await newPage(browser);
    await b.page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await b.page.getByLabel("Email").fill("stuck@example.com");
    await b.page.getByLabel("Password").fill("lagos2026");
    await b.page.locator("form").getByRole("button", { name: "Log in" }).click();
    await b.page.waitForURL(/\/dashboard/, { timeout: 20000 });
    await b.ctx.close();
    const p = (await state()).profiles[0];
    assert(p.account_status === "active", p.account_status);
    return "pending_payment → active on next login";
  });

  await check("Old 'pending manual' account is let in from the pending page", async () => {
    await reset();
    const a = await newPage(browser);
    await a.page.goto(`${BASE}/signup?role=artisan`, { waitUntil: "networkidle" });
    await fillAccount(a.page, { email: "manual@example.com" });
    await a.page.getByRole("button", { name: "Create account" }).click();
    await a.page.getByText("Step 3 of 4").waitFor({ timeout: 10000 });
    await fetch(`${MOCK}/__mock/set-profile`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "manual@example.com", patch: { account_status: "pending_manual" } }) });
    await a.page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
    await a.page.waitForURL(/\/dashboard/, { timeout: 20000 });
    await a.page.waitForTimeout(1500);
    await a.ctx.close();
    const p = (await state()).profiles[0];
    assert(p.account_status === "active", p.account_status);
    return "pending_manual → pending page → active";
  });

  await check("Upgrade: paid profile by card, confirmed by the webhook", async () => {
    await reset();
    const { ctx, page, errors } = await newPage(browser);
    // Fake Paystack pop-up that reports success straight away.
    await page.route("https://js.paystack.co/**", (r) =>
      r.fulfill({ status: 200, contentType: "application/javascript", body: "window.PaystackPop={setup:function(o){return{openIframe:function(){window.__paystack=o;setTimeout(function(){fetch('http://localhost:54321/__mock/webhook').then(function(){o.callback({reference:o.ref})})},300)}}}};" }),
    );
    await page.goto(`${BASE}/signup?role=artisan`, { waitUntil: "networkidle" });
    await fillAccount(page, { email: "pay@example.com" });
    await page.getByRole("button", { name: "Create account" }).click();
    await page.getByLabel("State").selectOption("Lagos");
    await page.getByLabel("City or town").selectOption("Ikeja");
    await page.getByRole("button", { name: "Next: your skills" }).click();
    await page.getByRole("button", { name: /^Plumbing/ }).click();
    await page.getByRole("button", { name: "Finish" }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    await page.goto(`${BASE}/upgrade`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Get a paid profile" }).waitFor({ timeout: 10000 });
    const total = await page.getByLabel("Order summary").textContent();
    await page.screenshot({ path: path.join(OUT, "upgrade-mobile.png"), fullPage: true });
    assert(/₦3,550/.test(total), `price ${total}`);
    await page.getByRole("button", { name: "Pay ₦3,550" }).click();
    await page.getByRole("heading", { name: "Your profile is upgraded" }).waitFor({ timeout: 20000 });
    const st = await state();
    const opts = await page.evaluate(() => window.__paystack && { amount: window.__paystack.amount, ref: window.__paystack.ref, currency: window.__paystack.currency });
    await ctx.close();
    assert(st.orders[0].order_type === "artisan_subscription" && Number(st.orders[0].amount) === 3550, JSON.stringify(st.orders[0]));
    assert(opts.amount === 355000 && opts.currency === "NGN", `paystack opts ${JSON.stringify(opts)}`);
    assert(opts.ref.endsWith(st.orders[0].id) && /^\d+-/.test(opts.ref), `ref ${opts.ref}`);
    assert(st.profiles[0].payment_status === "verified", st.profiles[0].payment_status);
    assert(errors.length === 0, errors.join(" | "));
    return "₦3,550 order → Paystack (355000 kobo, ref timestamp-orderId) → webhook → upgraded";
  });

  await check("Upgrade: bank transfer shows copyable details and the reference, then 'checking'", async () => {
    await reset();
    const { ctx, page } = await newPage(browser, DESKTOP);
    await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(`${BASE}/signup?role=artisan`, { waitUntil: "networkidle" });
    await fillAccount(page, { email: "bank@example.com" });
    await page.getByRole("button", { name: "Create account" }).click();
    await page.getByLabel("State").selectOption("Lagos");
    await page.getByLabel("City or town").selectOption("Ikeja");
    await page.getByRole("button", { name: "Next: your skills" }).click();
    await page.getByRole("button", { name: /^Plumbing/ }).click();
    await page.getByRole("button", { name: "Finish" }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await page.goto(`${BASE}/upgrade`, { waitUntil: "networkidle" });
    await page.getByRole("radio", { name: /Bank transfer/ }).click();
    await page.getByRole("button", { name: "Copy Account number" }).click();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    const narration = await page.getByText(/^S9-[0-9A-F]{8}$/).first().textContent();
    await page.screenshot({ path: path.join(OUT, "upgrade-transfer-desktop.png"), fullPage: true });
    await page.getByRole("button", { name: "I've sent ₦3,550" }).click();
    await page.getByRole("heading", { name: "We're checking your transfer" }).waitFor({ timeout: 10000 });
    const st = await state();
    await ctx.close();
    assert(clip === "0123456789", `copied "${clip}"`);
    assert(st.user_payments.length === 1 && Number(st.user_payments[0].amount) === 3550, JSON.stringify(st.user_payments));
    return `copied account number; narration ${narration}; transfer recorded`;
  });

  await check("Upgrade page for a company says there's nothing to pay", async () => {
    await reset();
    const { ctx, page } = await newPage(browser);
    await page.goto(`${BASE}/signup?role=company`, { waitUntil: "networkidle" });
    await fillAccount(page, { email: "co@example.com" });
    await page.getByRole("button", { name: "Create account" }).click();
    await page.getByLabel("Company name").fill("Co Ltd");
    await page.getByLabel("State").selectOption("Lagos");
    await page.getByLabel("City or town").selectOption("Yaba");
    await page.getByRole("button", { name: "Finish" }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await page.goto(`${BASE}/upgrade`, { waitUntil: "networkidle" });
    const h = await page.getByRole("heading", { level: 1 }).textContent();
    await ctx.close();
    assert(h === "Nothing to pay", h);
    return "company → Nothing to pay, link to post a job";
  });

  await check("Errors clear as soon as the field is fixed; each signup screen passes axe (WCAG 2.2 AA)", async () => {
    await reset();
    const { ctx, page } = await newPage(browser);
    const axe = async (label) => {
      if (!AxeBuilder) return "skipped";
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      const v = r.violations.map((x) => `${label}: ${x.id} (${x.nodes[0]?.target?.join(" ")})`);
      assert(v.length === 0, v.join(" || "));
    };
    await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
    assert(/Step 1 of 4/.test(await page.getByText(/Step 1 of/).textContent()), "step count not steady");
    await axe("role");
    await page.getByRole("radio", { name: /Find work or clients/ }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Create account" }).click();
    await axe("account with errors");
    await page.getByLabel("Full name").fill("Ada Okafor");
    assert((await page.locator("#acc-fullName-err").count()) === 0, "name error stayed after fixing");
    assert((await page.locator("#acc-email-err").count()) === 1, "other errors cleared too early");
    await fillAccount(page, { email: "axe@example.com" });
    await page.getByRole("button", { name: "Create account" }).click();
    await page.getByText("Step 3 of 4").waitFor({ timeout: 10000 });
    await page.getByRole("button", { name: "Next: your skills" }).click();
    await axe("profile with errors");
    await page.getByLabel("State").selectOption("Lagos");
    assert((await page.locator("#setup-state-err").count()) === 0, "state error stayed after choosing");
    await page.getByLabel("City or town").selectOption("Ikeja");
    await page.getByRole("button", { name: "Next: your skills" }).click();
    await page.getByText("Step 4 of 4").waitFor({ timeout: 10000 });
    await axe("skills");
    await page.getByRole("button", { name: /^Plumbing/ }).click();
    await page.getByRole("button", { name: "Finish" }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await page.goto(`${BASE}/upgrade`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Get a paid profile" }).waitFor({ timeout: 10000 });
    await axe("upgrade");
    await ctx.close();
    return AxeBuilder ? "errors clear on edit; 0 violations on 5 screens" : "errors clear on edit (axe not installed)";
  });

  await browser.close();
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  — ${r.detail}` : ""}`);
  console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed`);
})();
