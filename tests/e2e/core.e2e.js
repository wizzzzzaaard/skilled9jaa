// Browser checks for homepage, login, password reset and job posting.
// Supabase is mocked: nothing reaches the live project.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE_URL || "http://localhost:3100";
const SUPA = "https://vqzvvupwhzjaahfqgron.supabase.co";
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
const DESKTOP = { viewport: { width: 1366, height: 900 } };

async function guard(page, log = []) {
  await page.route(`${SUPA}/**`, (route) => {
    log.push({ url: route.request().url(), method: route.request().method(), body: route.request().postData() });
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
}

(async () => {
  const browser = await chromium.launch();

  await check("Homepage hero has signup buttons and no invented numbers", async () => {
    const ctx = await browser.newContext(DESKTOP);
    const page = await ctx.newPage();
    await guard(page);
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const work = await page.getByRole("link", { name: "Find work near me" }).first().getAttribute("href");
    const hire = await page.getByRole("link", { name: "Hire staff" }).first().getAttribute("href");
    const html = await page.content();
    await page.screenshot({ path: path.join(OUT, "home-desktop.png"), clip: { x: 0, y: 0, width: 1366, height: 900 } });
    await ctx.close();
    assert(work === "/jobs-near-me" && hire === "/hire", `links ${work} ${hire}`);
    for (const fake of ["Bookings Completed", "Verified &amp; Safe", "States Covered", "zero cuts", "home-service-shield", "/post-job"]) {
      assert(!html.includes(fake), `still shows "${fake}"`);
    }
    return "CTAs → /jobs-near-me, /hire; fake stats gone";
  });

  await check("Login: labels are tied to fields; wrong password shows a plain message", async () => {
    const ctx = await browser.newContext(MOBILE);
    const page = await ctx.newPage();
    await guard(page);
    await page.route(`${SUPA}/auth/v1/token**`, (r) =>
      r.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "invalid_grant", error_description: "Invalid login credentials", code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" }) }),
    );
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.getByLabel("Email").fill("ada@example.com");
    await page.getByLabel("Password").fill("wrongpass1");
    await page.locator("form").getByRole("button", { name: "Log in" }).click();
    const alert = page.locator("form [role=alert]");
    await alert.waitFor({ timeout: 8000 });
    const t = await alert.textContent();
    const forgot = await page.getByRole("link", { name: "Forgot password?" }).getAttribute("href");
    await ctx.close();
    assert(/don't match/.test(t), t);
    assert(forgot === "/forgot-password", `forgot link ${forgot}`);
    return t.trim();
  });

  await check("Login returns to ?next page, and refuses an outside site", async () => {
    const user = { id: "11111111-1111-4111-8111-111111111111", aud: "authenticated", role: "authenticated", email: "ada@example.com", app_metadata: {}, user_metadata: {} };
    const out = [];
    for (const next of ["/jobs/post", "//evil.example.com", "https://evil.example.com"]) {
      // A fresh browser each time: after a (fake) login the server would try the live database.
      const ctx = await browser.newContext(DESKTOP);
      const page = await ctx.newPage();
      await guard(page);
      await page.route(`${SUPA}/auth/v1/token**`, (r) =>
        r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ access_token: "t", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user }) }),
      );
      await page.goto(`${BASE}/login?next=${encodeURIComponent(next)}`, { waitUntil: "networkidle" });
      await page.getByLabel("Email").fill("ada@example.com");
      await page.getByLabel("Password").fill("lagos2026");
      const seen = [];
      page.on("request", (r) => {
        const u = r.url();
        if (!u.startsWith(BASE) || u.includes("/login") || u.includes("/_next/static")) return;
        seen.push(u);
      });
      await page.locator("form").getByRole("button", { name: "Log in" }).click();
      await page.waitForTimeout(2500);
      out.push(seen[0] || "(none)");
      await ctx.close();
    }
    assert(out[0].startsWith(`${BASE}/jobs/post`), `next not followed: ${out[0]}`);
    assert(out[1].startsWith(`${BASE}/dashboard`) && out[2].startsWith(`${BASE}/dashboard`), `unsafe next followed: ${out.slice(1)}`);
    assert(!out.some((u) => u.includes("evil")), "went to an outside site");
    return "inside path followed; outside sites sent to /dashboard";
  });

  await check("Logged-out visit to /wallet keeps the page to return to", async () => {
    const r = await fetch(`${BASE}/wallet`, { redirect: "manual" });
    const loc = r.headers.get("location") || "";
    assert(/\/login\?next=%2Fwallet/.test(loc), loc);
    return loc;
  });

  await check("Forgot password: same message whether or not the email exists", async () => {
    const ctx = await browser.newContext(MOBILE);
    const page = await ctx.newPage();
    const log = [];
    await guard(page, log);
    await page.route(`${SUPA}/auth/v1/recover**`, (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
    await page.goto(`${BASE}/forgot-password`, { waitUntil: "networkidle" });
    await page.getByLabel("Email").fill("Nobody@Example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await page.getByText("Check your email").waitFor({ timeout: 8000 });
    const body = await page.locator("[role=status]").textContent();
    await ctx.close();
    assert(/If nobody@example.com has a Skilled9ja account/.test(body), body);
    return body.trim().slice(0, 80);
  });

  await check("Reset page with no valid link offers a new link", async () => {
    const ctx = await browser.newContext(MOBILE);
    const page = await ctx.newPage();
    await guard(page);
    await page.goto(`${BASE}/reset-password`, { waitUntil: "networkidle" });
    await page.getByText("This reset link has expired").waitFor({ timeout: 8000 });
    const href = await page.getByRole("link", { name: "Send a new link" }).getAttribute("href");
    await ctx.close();
    assert(href === "/forgot-password", href);
    return "expired state shown";
  });

  await check("Post a job: logged-out visitors are offered a company account", async () => {
    const ctx = await browser.newContext(MOBILE);
    const page = await ctx.newPage();
    await guard(page);
    await page.goto(`${BASE}/jobs/post`, { waitUntil: "networkidle" });
    const create = await page.getByRole("link", { name: "Create company account" }).getAttribute("href");
    const login = await page.getByRole("link", { name: "Log in" }).last().getAttribute("href");
    await ctx.close();
    assert(create === "/hire", create);
    assert(login === "/login?next=/jobs/post", login);
    return "offers /hire and log in";
  });

  await browser.close();
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  — ${r.detail}` : ""}`);
  console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed`);
})();
