// Step-by-step browser tests for the niche landing pages and signup entry.
// Supabase is mocked at the network layer: no request reaches the live project.
const { chromium } = require("playwright");
const { AxeBuilder } = require("@axe-core/playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE_URL || "http://localhost:3100";
const SUPA = "https://vqzvvupwhzjaahfqgron.supabase.co";
const OUT = path.join(__dirname, "shots");
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const pass = (name, detail = "") => results.push({ ok: true, name, detail });
const fail = (name, detail = "") => results.push({ ok: false, name, detail });
async function check(name, fn) {
  try {
    const d = await fn();
    pass(name, d || "");
  } catch (e) {
    fail(name, String(e.message || e).split("\n")[0]);
  }
}
const assert = (c, m) => {
  if (!c) throw new Error(m);
};

const MOBILE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const DESKTOP = { viewport: { width: 1366, height: 900 } };

/** Blocks every Supabase call unless a test mocks it, and records requests. */
async function guard(page, log) {
  await page.route(`${SUPA}/**`, (route) => {
    log.push({ url: route.request().url(), method: route.request().method(), body: route.request().postData() });
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
}

const fakeUser = (id = "11111111-1111-4111-8111-111111111111", email = "ada@example.com") => ({
  id,
  aud: "authenticated",
  role: "authenticated",
  email,
  identities: [{ id, provider: "email" }],
  user_metadata: {},
  app_metadata: { provider: "email" },
  created_at: new Date().toISOString(),
});

async function fillForm(page, { name = "Ada Okafor", phone = "0803 123 4567", email = "ada@example.com", password = "lagos2026", consent = true } = {}) {
  const form = page.locator("form#join");
  await form.getByLabel("Full name").fill(name);
  await form.getByLabel("Phone number").fill(phone);
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Create a password").fill(password);
  if (consent) await form.getByRole("checkbox").check();
  await page.waitForTimeout(1600); // past the bot timer, like a real person
}

(async () => {
  const browser = await chromium.launch();

  // 1. Every page renders, on mobile and desktop
  const slugs = ["lawyers", "nysc", "jobs-near-me", "developers", "artisans", "plumbers", "tailors", "digital-creators", "web-designers", "makeup-artists", "hire", "hire-a-pro"];
  for (const slug of slugs) {
    for (const [label, opts] of [["mobile", MOBILE], ["desktop", DESKTOP]]) {
      await check(`/${slug} renders on ${label}`, async () => {
        const ctx = await browser.newContext(opts);
        const page = await ctx.newPage();
        const log = [];
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        page.on("console", (m) => m.type() === "error" && !/Failed to load resource|ERR_|net::/.test(m.text()) && errors.push(m.text()));
        await guard(page, log);
        const res = await page.goto(`${BASE}/${slug}`, { waitUntil: "networkidle" });
        assert(res.status() === 200, `status ${res.status()}`);
        const h1 = await page.locator("h1").count();
        assert(h1 === 1, `expected one h1, found ${h1}`);
        assert((await page.getByRole("link", { name: "Find Talent" }).count()) === 0, "global header still visible");
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        assert(overflow <= 1, `horizontal overflow ${overflow}px`);
        const formTop = await page.locator("form#join").boundingBox();
        if (label === "mobile") assert(formTop && formTop.y < 844 * 1.6, `form starts too low on mobile (${Math.round(formTop.y)}px)`);
        else assert(formTop && formTop.y < 900, "form not in first screen on desktop");
        assert(errors.length === 0, `console errors: ${errors.join(" | ")}`);
        const title = await page.title();
        assert(title.includes("Skilled9ja"), `title "${title}"`);
        if (["lawyers", "nysc", "jobs-near-me", "developers", "plumbers", "hire"].includes(slug)) {
          await page.screenshot({ path: path.join(OUT, `${slug}-${label}.png`), fullPage: true });
        }
        await ctx.close();
        return `h1 ok, form at ${Math.round(formTop.y)}px`;
      });
    }
  }

  // 2. Accessibility (WCAG 2.2 AA rules via axe)
  for (const slug of ["lawyers", "jobs-near-me", "nysc", "developers"]) {
    await check(`/${slug} passes axe WCAG A/AA`, async () => {
      const ctx = await browser.newContext(MOBILE);
      const page = await ctx.newPage();
      await guard(page, []);
      await page.goto(`${BASE}/${slug}`, { waitUntil: "networkidle" });
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      await ctx.close();
      const v = r.violations.map((x) => `${x.id} (${x.nodes.length}): ${x.nodes[0]?.target?.join(" ")}`);
      assert(v.length === 0, v.join(" || "));
      return `${r.passes.length} rules passed`;
    });
  }

  // 3. Empty submit shows every error and moves focus to the first field
  await check("Empty form: errors shown, focus on full name", async () => {
    const ctx = await browser.newContext(MOBILE);
    const page = await ctx.newPage();
    const log = [];
    await guard(page, log);
    await page.goto(`${BASE}/plumbers`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1600);
    await page.locator("form#join button[type=submit]").click();
    const errs = await page.locator("form#join [id$='-err']").allTextContents();
    const focused = await page.evaluate(() => document.activeElement?.getAttribute("autocomplete"));
    await page.screenshot({ path: path.join(OUT, "form-errors-mobile.png"), clip: await page.locator("form#join").boundingBox() });
    await ctx.close();
    assert(errs.length === 5, `expected 5 errors, got ${errs.length}: ${errs.join(" / ")}`);
    assert(focused === "name", `focus on ${focused}`);
    assert(!log.some((l) => l.url.includes("/auth/v1/signup")), "called signup with invalid data");
    return errs.join(" / ");
  });

  // 4. Field rules: phone, name, password
  await check("Rejects bad phone, single name and weak password", async () => {
    const ctx = await browser.newContext(MOBILE);
    const page = await ctx.newPage();
    await guard(page, []);
    await page.goto(`${BASE}/plumbers`, { waitUntil: "networkidle" });
    await fillForm(page, { name: "Ada", phone: "0603 123 4567", password: "password" });
    await page.locator("form#join button[type=submit]").click();
    const errs = await page.locator("form#join [id$='-err']").allTextContents();
    await ctx.close();
    assert(errs.length === 3, `got ${errs.length}: ${errs.join(" / ")}`);
    return errs.join(" / ");
  });

  // 5. Successful signup with campaign tags → continues to signup step 3 for that niche
  await check("Signup from /plumbers?utm_source=whatsapp continues with niche + tags saved", async () => {
    const ctx = await browser.newContext(MOBILE);
    const page = await ctx.newPage();
    const log = [];
    let signupBody = null;
    let profilePatch = null;
    await guard(page, log);
    await page.route(`${SUPA}/auth/v1/signup**`, (route) => {
      signupBody = JSON.parse(route.request().postData());
      const user = fakeUser();
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ access_token: "test-token", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user }),
      });
    });
    await page.route(`${SUPA}/rest/v1/profiles**`, (route) => {
      if (route.request().method() === "PATCH") profilePatch = JSON.parse(route.request().postData());
      route.fulfill({ status: 204, body: "" });
    });
    await page.goto(`${BASE}/plumbers?utm_source=whatsapp&utm_medium=social&utm_campaign=plumbers`, { waitUntil: "networkidle" });
    await fillForm(page, { email: "  Ada@Example.com " });
    // The next page's server check needs the live database, which this sandbox
    // can't reach, so assert on the navigation request the form makes.
    const navReq = page.waitForRequest((r) => r.url().startsWith(`${BASE}/signup?`), { timeout: 15000 });
    await page.locator("form#join button[type=submit]").click();
    const url = (await navReq).url();
    await ctx.close();
    assert(signupBody, "signup not called");
    const d = signupBody.data;
    assert(signupBody.email === "ada@example.com", `email not cleaned: "${signupBody.email}"`);
    assert(d.phone_number === "+2348031234567", `phone ${d.phone_number}`);
    assert(d.is_artisan === true && d.is_client === false, "role flags wrong");
    assert(d.signup_niche === "plumbers" && d.utm_source === "whatsapp" && d.utm_campaign === "plumbers", `tags ${JSON.stringify(d)}`);
    assert(d.consent_terms_at, "consent time missing");
    assert(profilePatch && profilePatch.signup_step === 3 && profilePatch.active_mode === "artisan" && !("account_status" in profilePatch), `profile patch ${JSON.stringify(profilePatch)}`);
    assert(/\/signup\?resume=true&step=3&niche=plumbers/.test(url) || /\/login/.test(url), `ended at ${url}`);
    return `went to ${url.replace(BASE, "")}`;
  });

  // 6. Home-service page opens the home-service signup path
  await check("Signup from /makeup-artists goes to home-service mode", async () => {
    const ctx = await browser.newContext(MOBILE);
    const page = await ctx.newPage();
    let body = null;
    await guard(page, []);
    await page.route(`${SUPA}/auth/v1/signup**`, (route) => {
      body = JSON.parse(route.request().postData());
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ access_token: "t", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user: fakeUser() }) });
    });
    await page.route(`${SUPA}/rest/v1/profiles**`, (r) => r.fulfill({ status: 204, body: "" }));
    await page.goto(`${BASE}/makeup-artists`, { waitUntil: "networkidle" });
    await fillForm(page);
    const nav = page.waitForRequest((r) => r.url().includes("/signup?") && r.url().includes("mode=homeservice"), { timeout: 15000 });
    await page.locator("form#join button[type=submit]").click();
    const req = await nav;
    await ctx.close();
    assert(body.data.is_home_service_provider === true, "flag missing");
    return req.url().replace(BASE, "");
  });

  // 7. Company page sets company flags
  await check("Signup from /hire creates a company account", async () => {
    const ctx = await browser.newContext(DESKTOP);
    const page = await ctx.newPage();
    let body = null;
    await guard(page, []);
    await page.route(`${SUPA}/auth/v1/signup**`, (route) => {
      body = JSON.parse(route.request().postData());
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: fakeUser(), session: null }) });
    });
    await page.goto(`${BASE}/hire`, { waitUntil: "networkidle" });
    await fillForm(page);
    await page.locator("form#join button[type=submit]").click();
    await page.getByText("Check your email").waitFor({ timeout: 10000 });
    await ctx.close();
    assert(body.data.is_company === true && body.data.is_client === true, JSON.stringify(body.data));
    return "company flags sent; email-confirmation screen shown";
  });

  // 8. Existing email
  await check("Existing email shows 'already has an account' with Log in link", async () => {
    const ctx = await browser.newContext(MOBILE);
    const page = await ctx.newPage();
    await guard(page, []);
    await page.route(`${SUPA}/auth/v1/signup**`, (route) =>
      route.fulfill({ status: 422, contentType: "application/json", body: JSON.stringify({ code: 422, error_code: "user_already_exists", msg: "User already registered" }) }),
    );
    await page.goto(`${BASE}/lawyers`, { waitUntil: "networkidle" });
    await fillForm(page);
    await page.locator("form#join button[type=submit]").click();
    const alert = page.locator("form#join [role=alert]");
    await alert.waitFor({ timeout: 10000 });
    const text = await alert.textContent();
    const hasLogin = await alert.getByRole("link", { name: "Log in instead" }).count();
    await page.screenshot({ path: path.join(OUT, "existing-email-mobile.png"), clip: await page.locator("form#join").boundingBox() });
    await ctx.close();
    assert(/already has an account/.test(text) && hasLogin === 1, text);
    return text.trim();
  });

  // 9. Email confirmation hidden-duplicate case (user with no identities)
  await check("Hidden duplicate (confirmation on) is caught", async () => {
    const ctx = await browser.newContext(MOBILE);
    const page = await ctx.newPage();
    await guard(page, []);
    await page.route(`${SUPA}/auth/v1/signup**`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...fakeUser(), identities: [] }) }),
    );
    await page.goto(`${BASE}/nysc`, { waitUntil: "networkidle" });
    await fillForm(page);
    await page.locator("form#join button[type=submit]").click();
    await page.locator("form#join [role=alert]").waitFor({ timeout: 10000 });
    const t = await page.locator("form#join [role=alert]").textContent();
    await ctx.close();
    assert(/already has an account/.test(t), t);
    return t.trim();
  });

  // 10. Rate limit and offline messages
  await check("Rate-limit error gives a clear next step", async () => {
    const ctx = await browser.newContext(MOBILE);
    const page = await ctx.newPage();
    await guard(page, []);
    await page.route(`${SUPA}/auth/v1/signup**`, (route) =>
      route.fulfill({ status: 429, contentType: "application/json", body: JSON.stringify({ code: 429, error_code: "over_email_send_rate_limit", msg: "email rate limit exceeded" }) }),
    );
    await page.goto(`${BASE}/developers`, { waitUntil: "networkidle" });
    await fillForm(page);
    await page.locator("form#join button[type=submit]").click();
    await page.locator("form#join [role=alert]").waitFor({ timeout: 10000 });
    const t = await page.locator("form#join [role=alert]").textContent();
    await ctx.close();
    assert(/Wait a minute/.test(t), t);
    return t.trim();
  });

  await check("Offline submit is stopped with a message", async () => {
    const ctx = await browser.newContext(MOBILE);
    const page = await ctx.newPage();
    const log = [];
    await guard(page, log);
    await page.goto(`${BASE}/developers`, { waitUntil: "networkidle" });
    await fillForm(page);
    await ctx.setOffline(true);
    await page.locator("form#join button[type=submit]").click();
    const t = await page.locator("form#join [role=alert]").textContent();
    await ctx.close();
    assert(/offline/i.test(t), t);
    return t.trim();
  });

  // 11. Bot protection
  await check("Honeypot-filled submit never reaches signup", async () => {
    const ctx = await browser.newContext(DESKTOP);
    const page = await ctx.newPage();
    const log = [];
    await guard(page, log);
    await page.goto(`${BASE}/artisans`, { waitUntil: "networkidle" });
    await fillForm(page);
    await page.locator("form#join input[tabindex='-1']").fill("http://spam.example", { force: true });
    await page.locator("form#join button[type=submit]").click();
    await page.waitForTimeout(500);
    await ctx.close();
    assert(!log.some((l) => l.url.includes("/auth/v1/signup")), "bot reached signup");
    return "blocked";
  });

  // 12. Draft survives a reload, password does not
  await check("Draft (not password) survives a reload", async () => {
    const ctx = await browser.newContext(MOBILE);
    const page = await ctx.newPage();
    await guard(page, []);
    await page.goto(`${BASE}/tailors`, { waitUntil: "networkidle" });
    await fillForm(page, { consent: false });
    await page.reload({ waitUntil: "networkidle" });
    const name = await page.locator("form#join").getByLabel("Full name").inputValue();
    const pw = await page.locator("form#join").getByLabel("Create a password").inputValue();
    await ctx.close();
    assert(name === "Ada Okafor" && pw === "", `name="${name}" pw="${pw}"`);
    return "name kept, password cleared";
  });

  // 13. Commute calculator maths
  await check("Commute calculator: ₦2,000 fare × 2 × 22 days = ₦88,000 (59% of ₦150,000)", async () => {
    const ctx = await browser.newContext(DESKTOP);
    const page = await ctx.newPage();
    await guard(page, []);
    await page.goto(`${BASE}/jobs-near-me`, { waitUntil: "networkidle" });
    const fare = page.getByLabel("Transport to work, one way (₦)");
    await fare.fill("2000");
    await fare.blur();
    const big = await page.locator("[aria-live=polite] p").first().textContent();
    const label = await page.locator("[aria-live=polite] p").nth(1).textContent();
    const save = await page.getByText("more in your pocket").textContent();
    await page.locator("[aria-live=polite]").scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, "commute-calculator-desktop.png"), clip: await page.locator("[aria-live=polite]").locator("xpath=..").boundingBox() });
    // Edge cases: empty salary and junk text
    await page.getByLabel("Monthly salary (₦)").fill("");
    const noSalary = await page.locator("[aria-live=polite] p").nth(1).textContent();
    await page.getByLabel("Work days a month").fill("abc");
    const junk = await page.locator("[aria-live=polite] p").first().textContent();
    await ctx.close();
    assert(big.replace(/\s/g, "") === "₦88,000", `big=${big}`);
    assert(/59%/.test(label), label);
    assert(/₦74,800/.test(save), save);
    assert(!/%/.test(noSalary), `percent shown without salary: ${noSalary}`);
    assert(junk.trim() === "₦0", `junk days gave ${junk}`);
    return `${big} · ${label.trim()} · ${save.trim()}`;
  });

  // 14. Sticky button on mobile
  await check("Mobile sticky button appears after the form scrolls away, jumps back to the form", async () => {
    const ctx = await browser.newContext(MOBILE);
    const page = await ctx.newPage();
    await guard(page, []);
    await page.goto(`${BASE}/nysc`, { waitUntil: "networkidle" });
    const sticky = page.locator("a[href='#join']").last();
    const before = await sticky.evaluate((el) => el.parentElement.getAttribute("aria-hidden"));
    await page.mouse.wheel(0, 2500);
    await page.waitForTimeout(600);
    const after = await sticky.evaluate((el) => el.parentElement.getAttribute("aria-hidden"));
    await page.screenshot({ path: path.join(OUT, "sticky-mobile.png") });
    await sticky.click();
    await page.waitForTimeout(900);
    const focused = await page.evaluate(() => document.activeElement?.getAttribute("autocomplete"));
    await ctx.close();
    assert(before === "true" && after === "false", `hidden before=${before} after=${after}`);
    assert(focused === "name", `focus on ${focused}`);
    return "shown after scroll; tap focuses Full name";
  });

  // 15. Keyboard: skip link and visible focus
  await check("Keyboard: first Tab reaches the skip link, which lands in the form", async () => {
    const ctx = await browser.newContext(DESKTOP);
    const page = await ctx.newPage();
    await guard(page, []);
    await page.goto(`${BASE}/lawyers`, { waitUntil: "networkidle" });
    await page.keyboard.press("Tab");
    const t = await page.evaluate(() => document.activeElement?.textContent);
    await ctx.close();
    assert(/Skip to signup form/.test(t), `first focus: ${t}`);
    return "skip link first";
  });

  // 16. FAQ structured data
  await check("FAQ structured data present and valid JSON", async () => {
    const html = await (await fetch(`${BASE}/lawyers`)).text();
    const m = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    assert(m, "no JSON-LD");
    const j = JSON.parse(m[1]);
    assert(j["@type"] === "FAQPage" && j.mainEntity.length >= 3, "bad FAQ schema");
    assert(/<link rel="canonical" href="[^"]*\/lawyers"/.test(html), "no canonical");
    return `${j.mainEntity.length} questions`;
  });

  // 17. Routing and access
  await check("Unknown slug is not rendered by the landing template", async () => {
    const r = await fetch(`${BASE}/plumberz`, { redirect: "manual" });
    const body = r.status === 200 ? await r.text() : "";
    assert(!body.includes('id="join"'), "typo slug rendered a landing page");
    return `status ${r.status} ${r.headers.get("location") || ""}`;
  });
  for (const p of ["/dashboard", "/admin", "/admin/campaigns", "/wallet", "/profile"]) {
    await check(`Logged-out visit to ${p} redirects to /login`, async () => {
      const r = await fetch(`${BASE}${p}`, { redirect: "manual" });
      const loc = r.headers.get("location") || "";
      assert(r.status >= 300 && r.status < 400 && loc.includes("/login"), `status ${r.status} location ${loc}`);
    });
  }
  for (const p of ["/", "/find", "/jobs", "/lawyers", "/privacy", "/terms", "/signup"]) {
    await check(`Logged-out visit to ${p} stays public`, async () => {
      const r = await fetch(`${BASE}${p}`, { redirect: "manual" });
      assert(r.status === 200, `status ${r.status}`);
    });
  }

  // 18. Live job count: server can't reach Supabase from this sandbox, so the
  // number must simply be left out rather than show 0 or break the page.
  await check("Open-jobs count hidden gracefully when the database is unreachable", async () => {
    const html = await (await fetch(`${BASE}/jobs-near-me`)).text();
    assert(!/>0<\/strong> open jobs/.test(html), "showed zero jobs");
    return /open jobs on Skilled9ja/.test(html) ? "count shown" : "count omitted";
  });

  await browser.close();

  const ok = results.filter((r) => r.ok).length;
  fs.writeFileSync(path.join(__dirname, "results.json"), JSON.stringify(results, null, 2));
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  — ${r.detail}` : ""}`);
  console.log(`\n${ok}/${results.length} passed`);
})();
