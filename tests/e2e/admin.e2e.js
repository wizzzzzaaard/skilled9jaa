// Admin tools (members, jobs moderation, reports, audit log, settings),
// against tests/mock-supabase/server.js, which mirrors the admin-actions function.
const { chromium } = require("playwright");
const { AxeBuilder } = require("@axe-core/playwright");
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
const DESKTOP = { viewport: { width: 1360, height: 900 }, acceptDownloads: true };
const post = (p, body) => fetch(`${MOCK}${p}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const reset = () => fetch(`${MOCK}/__mock/reset`);
const state = () => fetch(`${MOCK}/__mock/state`).then((r) => r.json());
const setProfile = (email, patch) => post("/__mock/set-profile", { email, patch });
const member = (email, full_name, patch = {}) =>
  post("/auth/v1/signup", { email, password: "lagos2026", data: { full_name, is_artisan: true } }).then(() => setProfile(email, { full_name, phone_number: "08031234567", state: "Lagos", ...patch }));

async function open(browser, opts = DESKTOP) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(/supabase\.co|googleapis|gstatic|wa\.me/, (r) => r.fulfill({ status: 204, body: "" }));
  return { ctx, page, errors };
}

/** Seeds an admin plus a few members and signs the admin in. */
async function asAdmin(browser, opts) {
  await reset();
  await member("boss@example.com", "Ada Admin", { account_status: "active", is_admin: true });
  await member("stuck1@example.com", "Chidi Stuck", { account_status: "pending_payment" });
  await member("stuck2@example.com", "Bisi Stuck", { account_status: "incomplete", state: "Oyo" });
  await member("done@example.com", "Emeka Done", { account_status: "active", payment_status: "verified" });
  const a = await open(browser, opts);
  await a.page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await a.page.getByLabel("Email").fill("boss@example.com");
  await a.page.getByLabel("Password").fill("lagos2026");
  await a.page.locator("form").getByRole("button", { name: "Log in" }).click();
  await a.page.waitForURL((u) => !/\/login/.test(u.pathname), { timeout: 15000 });
  return a;
}
const rowsText = (page) => page.locator("tbody").innerText();

(async () => {
  const browser = await chromium.launch();

  await check("Members: list, search by name and by S9- reference, filter stuck", async () => {
    const a = await asAdmin(browser);
    await a.page.goto(`${BASE}/admin/users`, { waitUntil: "networkidle" });
    await a.page.getByText("Chidi Stuck").waitFor({ timeout: 10000 });
    let t = await rowsText(a.page);
    assert(/Garki Mart/.test(t) && /Emeka Done/.test(t), `missing rows: ${t.slice(0, 200)}`);

    await a.page.getByLabel("Search members").fill("bisi");
    await a.page.waitForFunction(() => !document.querySelector("tbody")?.textContent?.includes("Chidi"), null, { timeout: 5000 });
    t = await rowsText(a.page);
    assert(/Bisi Stuck/.test(t) && !/Emeka/.test(t), `name search: ${t.slice(0, 200)}`);

    const s = await state();
    const chidi = s.profiles.find((p) => p.email === "stuck1@example.com");
    const ref = `S9-${chidi.id.slice(0, 8).toUpperCase()}`;
    await a.page.getByLabel("Search members").fill(ref);
    await a.page.waitForFunction(() => document.querySelector("tbody")?.textContent?.includes("Chidi"), null, { timeout: 5000 });
    t = await rowsText(a.page);
    assert(!/Bisi/.test(t), `reference search leaked rows: ${t.slice(0, 200)}`);

    await a.page.getByLabel("Search members").fill("");
    await a.page.waitForFunction(() => document.querySelector("tbody")?.textContent?.includes("Emeka"), null, { timeout: 5000 });
    await a.page.getByLabel("Status").selectOption("stuck");
    await a.page.waitForFunction(() => { const t = document.querySelector("tbody")?.textContent ?? ""; return !t.includes("Emeka") && t.includes("Bisi"); }, null, { timeout: 5000 });
    t = await rowsText(a.page);
    assert(/Chidi/.test(t) && /Bisi/.test(t), `stuck filter: ${t.slice(0, 200)}`);
    await a.page.screenshot({ path: path.join(OUT, "admin-members-desktop.png"), fullPage: true });
    await a.ctx.close();
    return `name, ${ref} and stuck filter all narrow correctly`;
  });

  await check("Members: bulk 'Let in' activates stuck members and is audited", async () => {
    const a = await asAdmin(browser);
    await a.page.goto(`${BASE}/admin/users`, { waitUntil: "networkidle" });
    await a.page.getByLabel("Status").selectOption("stuck");
    await a.page.getByText("Bisi Stuck").waitFor({ timeout: 10000 });
    await a.page.getByLabel("Select all on this page").check();
    await a.page.getByRole("button", { name: /Let in 2 stuck/ }).click();
    await a.page.getByText("Let 2 members in.").waitFor({ timeout: 10000 });
    const s = await state();
    await a.ctx.close();
    const statuses = s.profiles.filter((p) => /stuck/.test(p.email)).map((p) => p.account_status);
    assert(statuses.every((x) => x === "active"), `statuses: ${statuses}`);
    assert(s.audit.length === 1 && s.audit[0].action === "let_in", `audit: ${JSON.stringify(s.audit)}`);
    return "2 members activated, 1 audit entry";
  });

  await check("Member panel: suspend needs a reason, admins can't be suspended, mark paid works", async () => {
    const a = await asAdmin(browser);
    await a.page.goto(`${BASE}/admin/users`, { waitUntil: "networkidle" });
    await a.page.getByRole("button", { name: /Ada Admin/ }).click();
    const dlg = a.page.getByRole("dialog");
    await dlg.waitFor();
    assert((await dlg.getByRole("button", { name: "Suspend" }).count()) === 0, "admin could be suspended");
    await dlg.getByRole("button", { name: "Close", exact: true }).click();

    await a.page.getByRole("button", { name: /Emeka Done/ }).click();
    assert((await dlg.getByRole("link", { name: "WhatsApp" }).getAttribute("href")) === "https://wa.me/2348031234567", "bad WhatsApp link");
    await dlg.getByRole("button", { name: "Suspend" }).click();
    const confirm = dlg.getByRole("button", { name: "Confirm" });
    assert(await confirm.isDisabled(), "suspend allowed without reason");
    await dlg.getByLabel(/Reason/).fill("Fake reviews");
    await confirm.click();
    await dlg.getByText("Done. The change is in the audit log.").waitFor({ timeout: 10000 });
    await dlg.getByRole("button", { name: "Reactivate" }).waitFor();
    await a.page.keyboard.press("Escape");
    await dlg.waitFor({ state: "detached" });

    await a.page.getByRole("button", { name: /Chidi Stuck/ }).click();
    await dlg.getByRole("button", { name: "Mark as paid" }).click();
    await dlg.getByRole("button", { name: "Confirm" }).click();
    await dlg.getByText("Done. The change is in the audit log.").waitFor({ timeout: 10000 });
    const s = await state();
    await a.ctx.close();
    const emeka = s.profiles.find((p) => p.email === "done@example.com");
    const chidi = s.profiles.find((p) => p.email === "stuck1@example.com");
    assert(emeka.account_status === "suspended", `emeka: ${emeka.account_status}`);
    assert(chidi.payment_status === "verified", `chidi: ${chidi.payment_status}`);
    assert(s.audit.find((x) => x.action === "set_user_status")?.reason === "Fake reviews", "reason not logged");
    return "suspend (with reason) + mark paid, both logged; admin protected; wa.me link correct";
  });

  await check("Members: CSV export downloads with a header row and no formula injection", async () => {
    const a = await asAdmin(browser);
    await setProfile("done@example.com", { full_name: "=HYPERLINK(\"x\")" });
    await a.page.goto(`${BASE}/admin/users`, { waitUntil: "networkidle" });
    await a.page.getByText("Chidi Stuck").waitFor({ timeout: 10000 });
    const [dl] = await Promise.all([a.page.waitForEvent("download"), a.page.getByRole("button", { name: "Export CSV" }).click()]);
    const csv = fs.readFileSync(await dl.path(), "utf8");
    await a.ctx.close();
    assert(/^﻿?Name,Company,Email/.test(csv), `header: ${csv.slice(0, 60)}`);
    assert(/'=HYPERLINK/.test(csv), "formula not neutralised");
    return `${csv.trim().split("\n").length - 1} rows, ${dl.suggestedFilename()}`;
  });

  await check("Jobs: remove needs a reason, then reopen; both audited", async () => {
    const a = await asAdmin(browser);
    await a.page.goto(`${BASE}/admin/jobs`, { waitUntil: "networkidle" });
    await a.page.getByText("Garki Mart Ltd").first().waitFor({ timeout: 10000 });
    const first = a.page.locator("tbody tr").first();
    const title = (await first.locator("td").first().locator("a, span").first().innerText()).trim();
    await first.getByRole("button", { name: "Remove" }).click();
    const confirm = a.page.getByRole("button", { name: "Confirm" });
    assert(await confirm.isDisabled(), "remove allowed without reason");
    await a.page.getByLabel(/Reason/).fill("Scam: asks for upfront fee");
    await confirm.click();
    await a.page.getByText(`"${title}" is now removed.`).waitFor({ timeout: 10000 });
    await a.page.getByRole("tab", { name: "Removed" }).click();
    await a.page.getByRole("button", { name: "Make live" }).first().click();
    await a.page.getByRole("button", { name: "Confirm" }).click();
    await a.page.getByText(`"${title}" is now live.`).waitFor({ timeout: 10000 });
    await a.page.screenshot({ path: path.join(OUT, "admin-jobs-desktop.png"), fullPage: true });
    const s = await state();
    await a.ctx.close();
    assert(s.audit.filter((x) => x.action === "set_job_status").length === 2, "job changes not logged");
    return `"${title}" removed then reopened`;
  });

  await check("Audit log lists changes with admin name and reason", async () => {
    const a = await asAdmin(browser);
    await a.page.goto(`${BASE}/admin/users`, { waitUntil: "networkidle" });
    await a.page.getByRole("button", { name: /Emeka Done/ }).click();
    await a.page.getByRole("dialog").getByRole("button", { name: "Suspend" }).click();
    await a.page.getByRole("dialog").getByLabel(/Reason/).fill("Spam posts");
    await a.page.getByRole("dialog").getByRole("button", { name: "Confirm" }).click();
    await a.page.getByText("Done. The change is in the audit log.").waitFor({ timeout: 10000 });
    await a.page.goto(`${BASE}/admin/audit`, { waitUntil: "networkidle" });
    await a.page.locator("ol").getByText("Changed member status").waitFor({ timeout: 10000 });
    const text = await a.page.locator("ol").innerText();
    await a.ctx.close();
    assert(/Ada Admin/.test(text) && /active → suspended/.test(text) && /Spam posts/.test(text), text.slice(0, 200));
    return "who, what and why shown";
  });

  await check("Reports: monthly revenue, funnel and sources render from real rows", async () => {
    const a = await asAdmin(browser);
    const s = await state();
    const emeka = s.profiles.find((p) => p.email === "done@example.com");
    // One approved transfer of ₦3,550 this month.
    await fetch(`${MOCK}/rest/v1/user_payments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ user_id: emeka.id, amount: 3550, status: "approved", approved_at: new Date().toISOString() }),
    });
    await a.page.goto(`${BASE}/admin/reports`, { waitUntil: "networkidle" });
    await a.page.getByText("Signup funnel (all time)").waitFor({ timeout: 10000 });
    const text = await a.page.locator("main").innerText();
    await a.page.screenshot({ path: path.join(OUT, "admin-reports-desktop.png"), fullPage: true });
    await a.ctx.close();
    assert(/₦3,550 in this period/.test(text), `revenue: ${text.slice(0, 300)}`);
    assert(/Started signup\s*5/.test(text), `funnel: ${text.match(/Started signup[^\n]*\n?[^\n]*/)?.[0]}`);
    return "₦3,550 this month; funnel counts 5 members";
  });

  await check("Settings: turning off both payment methods warns", async () => {
    const a = await asAdmin(browser);
    await a.page.goto(`${BASE}/admin/settings`, { waitUntil: "networkidle" });
    await a.page.getByText("Payment methods").waitFor({ timeout: 10000 });
    await a.page.getByLabel(/Card, bank and USSD/).uncheck();
    await a.page.getByLabel(/Direct bank transfer/).uncheck();
    await a.page.getByText("With both off, nobody can pay for a plan.").waitFor();
    await a.ctx.close();
    return "warning shown";
  });

  await check("Mobile: admin menu opens, navigates, closes with Escape; members page passes axe", async () => {
    const a = await asAdmin(browser, MOBILE);
    await a.page.goto(`${BASE}/admin/users`, { waitUntil: "networkidle" });
    await a.page.getByText("Chidi Stuck").waitFor({ timeout: 10000 });
    await a.page.screenshot({ path: path.join(OUT, "admin-members-mobile.png") });
    const axe = await new AxeBuilder({ page: a.page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    await a.page.getByRole("button", { name: /menu/i }).click();
    const nav = a.page.getByRole("dialog");
    await nav.getByRole("link", { name: "Jobs" }).click();
    await a.page.waitForURL(/\/admin\/jobs/);
    await a.page.getByRole("button", { name: /menu/i }).click();
    await a.page.keyboard.press("Escape");
    await a.page.getByRole("dialog").waitFor({ state: "detached" });
    await a.ctx.close();
    const v = axe.violations.map((x) => `${x.id}(${x.nodes.length})`);
    assert(!v.length, `axe: ${v.join(", ")}`);
    return "drawer works; 0 axe violations";
  });

  await check("Non-admins are kept out of /admin/users", async () => {
    await reset();
    await member("pleb@example.com", "Ola Member", { account_status: "active" });
    const a = await open(browser);
    await a.page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await a.page.getByLabel("Email").fill("pleb@example.com");
    await a.page.getByLabel("Password").fill("lagos2026");
    await a.page.locator("form").getByRole("button", { name: "Log in" }).click();
    await a.page.waitForURL((u) => !/\/login/.test(u.pathname), { timeout: 15000 });
    await a.page.goto(`${BASE}/admin/users`, { waitUntil: "networkidle" });
    const url = a.page.url();
    await a.ctx.close();
    assert(!/\/admin/.test(new URL(url).pathname), `stayed on ${url}`);
    return `redirected to ${new URL(url).pathname}`;
  });

  await browser.close();
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  — ${r.detail}` : ""}`);
  console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed`);
  process.exit(results.every((r) => r.ok) ? 0 : 1);
})();
