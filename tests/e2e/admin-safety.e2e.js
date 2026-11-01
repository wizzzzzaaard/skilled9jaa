// Trust & safety and the rest of the admin: reports, moderation, fraud warnings,
// roles, two-step login, notes, refunds, withdrawals, renewals, data requests,
// saved views, broadcasts, bookings and ID checks. Runs against tests/mock-supabase/server.js.
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
    const at = (String(e.stack || "").match(/admin-safety\.e2e\.js:(\d+)/) || [])[1];
    results.push({ ok: false, name, detail: `${String(e.message || e).split("\n")[0]}${at ? ` (line ${at})` : ""}` });
  }
}
const assert = (c, m) => {
  if (!c) throw new Error(m);
};
const MOBILE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const DESKTOP = { viewport: { width: 1360, height: 900 }, acceptDownloads: true };
const post = (p, body) => fetch(`${MOCK}${p}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json().catch(() => ({})));
const reset = () => fetch(`${MOCK}/__mock/reset`);
const state = () => fetch(`${MOCK}/__mock/state`).then((r) => r.json());
const setProfile = (email, patch) => post("/__mock/set-profile", { email, patch });
const insert = (table, rows) => post("/__mock/insert", { table, rows });
async function member(email, full_name, patch = {}) {
  await post("/auth/v1/signup", { email, password: "lagos2026", data: { full_name, is_artisan: true } });
  const p = await setProfile(email, { full_name, phone_number: "08031234567", state: "Lagos", account_status: "active", ...patch });
  return p;
}

async function open(browser, opts = DESKTOP) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(/supabase\.co|googleapis|gstatic|wa\.me/, (r) => r.fulfill({ status: 204, body: "" }));
  return { ctx, page, errors };
}
async function login(browser, email, opts) {
  const a = await open(browser, opts);
  await a.page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await a.page.getByLabel("Email").fill(email);
  await a.page.getByLabel("Password").fill("lagos2026");
  await a.page.locator("form").getByRole("button", { name: "Log in" }).click();
  await a.page.waitForURL((u) => !/\/login/.test(u.pathname), { timeout: 15000 });
  return a;
}
const seedAdmin = () => member("boss@example.com", "Ada Admin", { is_admin: true, admin_role: "owner" });

(async () => {
  const browser = await chromium.launch();

  await check("Members can report a job; logged-out visitors are asked to log in; repeats are fine", async () => {
    await reset();
    await member("tunde@example.com", "Tunde Bello");
    const anon = await open(browser, MOBILE);
    await anon.page.goto(`${BASE}/jobs/job-01`, { waitUntil: "networkidle" });
    await anon.page.getByRole("button", { name: "Report job" }).click();
    await anon.page.getByText("Log in to send a report").waitFor();
    await anon.ctx.close();

    const a = await login(browser, "tunde@example.com", MOBILE);
    await a.page.goto(`${BASE}/jobs/job-01`, { waitUntil: "networkidle" });
    await a.page.getByRole("button", { name: "Report job" }).click();
    const dlg = a.page.getByRole("dialog");
    assert(await dlg.getByRole("button", { name: "Send report" }).isDisabled(), "send enabled with no reason");
    await dlg.getByLabel(/Scam or asks for money/).check();
    await dlg.getByLabel(/Details/).fill("Asked me to pay ₦5,000 form fee on WhatsApp");
    await a.page.screenshot({ path: path.join(OUT, "report-job-mobile.png") });
    await dlg.getByRole("button", { name: "Send report" }).click();
    await dlg.getByText(/Thanks. Our team will look at it/).waitFor({ timeout: 10000 });
    await dlg.getByRole("button", { name: "Done" }).click();
    await a.page.getByRole("button", { name: "Report job" }).click();
    await dlg.getByLabel(/Spam/).check();
    await dlg.getByRole("button", { name: "Send report" }).click();
    await dlg.getByText(/Thanks/).waitFor({ timeout: 10000 });
    const s = await state();
    await a.ctx.close();
    assert(s.reports.length === 1 && s.reports[0].reason === "scam" && s.reports[0].target_id === "job-01", JSON.stringify(s.reports));
    return "1 report stored; duplicate treated as already reported";
  });

  await check("Moderation: grouped reports, badge count, remove job closes all reports about it", async () => {
    await reset();
    const boss = await seedAdmin();
    const r1 = await member("r1@example.com", "Reporter One");
    const r2 = await member("r2@example.com", "Reporter Two");
    await insert("content_reports", [
      { reporter_id: r1.id, target_type: "job", target_id: "job-02", reason: "scam", details: "Wants money upfront", status: "open" },
      { reporter_id: r2.id, target_type: "job", target_id: "job-02", reason: "fake", status: "open" },
    ]);
    void boss;
    const a = await login(browser, "boss@example.com");
    await a.page.goto(`${BASE}/admin/moderation`, { waitUntil: "networkidle" });
    await a.page.getByText("2 reports").waitFor({ timeout: 10000 });
    const badge = await a.page.locator("aside").getByRole("link", { name: /Reports & moderation/ }).innerText();
    assert(/2/.test(badge), `badge: ${badge}`);
    await a.page.getByRole("button", { name: "Remove job" }).click();
    await a.page.getByRole("alert").filter({ hasText: "Add a short note" }).waitFor();
    await a.page.getByLabel("Note for the audit log").fill("Fee scam confirmed");
    await a.page.screenshot({ path: path.join(OUT, "admin-moderation-desktop.png"), fullPage: true });
    await a.page.getByRole("button", { name: "Remove job" }).click();
    await a.page.getByText(/Closed 2 reports/).waitFor({ timeout: 10000 });
    const s = await state();
    await a.ctx.close();
    assert(s.jobs.find((j) => j.id === "job-02").status === "removed", "job not removed");
    assert(s.reports.every((r) => r.status === "actioned"), "reports still open");
    return "job removed, 2 reports closed";
  });

  await check("Moderation: hide a post, then show it again", async () => {
    await reset();
    await seedAdmin();
    const owner = await member("poster@example.com", "Kemi Poster");
    await insert("posts", { id: 7, user_id: owner.id, caption: "Call me for cheap visa", post_type: "image_carousel", hidden_at: null });
    const a = await login(browser, "boss@example.com");
    await a.page.goto(`${BASE}/admin/moderation`, { waitUntil: "networkidle" });
    await a.page.getByRole("tab", { name: "Posts", exact: true }).click();
    await a.page.getByText("Call me for cheap visa").waitFor({ timeout: 10000 });
    await a.page.getByLabel("Note for the audit log").fill("Off-topic advert");
    await a.page.getByRole("button", { name: "Hide post" }).click();
    await a.page.getByText(/Post hidden/).waitFor({ timeout: 10000 });
    let s = await state();
    assert(s.posts[0].hidden_at && s.posts[0].hidden_reason === "Off-topic advert", "not hidden");
    await a.page.getByRole("tab", { name: "Hidden posts" }).click();
    await a.page.getByRole("button", { name: "Show again" }).click();
    await a.page.getByText(/visible again/).waitFor({ timeout: 10000 });
    s = await state();
    await a.ctx.close();
    assert(!s.posts[0].hidden_at, "still hidden");
    return "hidden with reason, then restored";
  });

  await check("Fraud warnings: the same phone written two ways is caught", async () => {
    await reset();
    await seedAdmin();
    await member("a1@example.com", "Musa One", { phone_number: "08099990000" });
    await member("a2@example.com", "Musa Two", { phone_number: "+234 809 999 0000" });
    const a = await login(browser, "boss@example.com");
    await a.page.goto(`${BASE}/admin/risk`, { waitUntil: "networkidle" });
    await a.page.getByText(/2 accounts share/).waitFor({ timeout: 10000 });
    await a.page.getByRole("link", { name: "Open these in Members" }).click();
    await a.page.waitForURL(/\/admin\/users\?q=/);
    await a.page.getByText("Musa Two").waitFor({ timeout: 10000 });
    const t = await a.page.locator("tbody").innerText();
    await a.ctx.close();
    assert(/Musa One/.test(t) && !/Ada Admin/.test(t), t.slice(0, 200));
    return "warning shown and links to a filtered member list";
  });

  await check("Roles: owner adds a support admin, who can't open money pages", async () => {
    await reset();
    await seedAdmin();
    await member("help@example.com", "Sade Support");
    const o = await login(browser, "boss@example.com");
    await o.page.goto(`${BASE}/admin/team`, { waitUntil: "networkidle" });
    await o.page.getByLabel("Their email").fill("HELP@example.com");
    await o.page.getByRole("button", { name: "Add to team" }).click();
    await o.page.getByText("Sade Support is now support.").waitFor({ timeout: 10000 });
    await o.ctx.close();

    const s = await login(browser, "help@example.com");
    await s.page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
    await s.page.locator("aside").getByRole("link", { name: "Members" }).waitFor({ timeout: 10000 });
    await s.page.waitForTimeout(500);
    const nav = await s.page.locator("aside nav").innerText();
    assert(!/Payments|Settings|Admin team|Data requests/.test(nav), `support sees: ${nav}`);
    await s.page.goto(`${BASE}/admin/payments`, { waitUntil: "networkidle" });
    await s.page.getByText("That page is for owner admins only.").waitFor({ timeout: 10000 });
    const url = s.page.url();
    await s.ctx.close();
    assert(/\/admin\?owner_only=1/.test(url), url);
    return "support nav trimmed; /admin/payments redirects with a notice";
  });

  await check("Two-step login: set up with a code, then required at the next sign-in", async () => {
    await reset();
    await seedAdmin();
    const a = await login(browser, "boss@example.com");
    await a.page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
    await a.page.getByRole("link", { name: "turn on two-step login" }).click();
    await a.page.getByRole("button", { name: "Set it up" }).click();
    await a.page.getByText("MOCKSECRET234567").waitFor({ timeout: 10000 });
    await a.page.getByLabel(/Enter the 6-digit code/).fill("000000");
    await a.page.getByRole("button", { name: "Turn on" }).click();
    await a.page.getByText("That code didn't work.").waitFor({ timeout: 10000 });
    await a.page.getByLabel(/Enter the 6-digit code/).fill("123456");
    await a.page.getByRole("button", { name: "Turn on" }).click();
    await a.page.getByText("Two-step login is on.").first().waitFor({ timeout: 10000 });
    await a.ctx.close();

    const b = await login(browser, "boss@example.com");
    await b.page.goto(`${BASE}/admin/users`, { waitUntil: "networkidle" });
    await b.page.waitForURL(/\/two-step/, { timeout: 10000 });
    await b.page.getByLabel("6-digit code").fill("123456");
    await b.page.getByRole("button", { name: "Continue" }).click();
    await b.page.waitForURL(/\/admin\/users/, { timeout: 15000 });
    await b.page.getByText("Ada Admin").first().waitFor({ timeout: 10000 });
    await b.ctx.close();
    return "wrong code refused; sign-in asks for the code before the admin opens";
  });

  await check("Member panel: team notes and a transfer refund that removes paid features", async () => {
    await reset();
    await seedAdmin();
    const m = await member("payer@example.com", "Chinedu Payer", { payment_status: "verified" });
    await insert("user_payments", { id: "tx-1", user_id: m.id, amount: 3550, status: "approved", approved_at: new Date().toISOString() });
    await insert("orders", { id: "ord-1", user_id: m.id, amount: 3550, status: "verified", payment_reference: "123-ord-1", order_type: "artisan" });
    const a = await login(browser, "boss@example.com");
    await a.page.goto(`${BASE}/admin/users`, { waitUntil: "networkidle" });
    await a.page.getByRole("button", { name: /Chinedu Payer/ }).click();
    const dlg = a.page.getByRole("dialog");
    await dlg.getByLabel("Add a note").fill("Called 12 Oct, asked for refund");
    await dlg.getByRole("button", { name: "Add", exact: true }).click();
    await dlg.getByText("Called 12 Oct, asked for refund").waitFor({ timeout: 10000 });

    // Card refund needs the Paystack key on the server; the error says so plainly.
    const refundButtons = dlg.getByRole("button", { name: "Refund", exact: true });
    await refundButtons.first().waitFor({ timeout: 10000 });
    const card = dlg.locator("li", { hasText: "Card (Paystack)" });
    await card.getByRole("button", { name: "Refund", exact: true }).click();
    await card.getByLabel("Reason").fill("Duplicate payment");
    await card.getByRole("button", { name: "Refund", exact: true }).click();
    await card.getByText(/Paystack isn't connected/).waitFor({ timeout: 10000 });
    await card.getByRole("button", { name: "Cancel" }).click();

    const tx = dlg.locator("li", { hasText: "Bank transfer" });
    await tx.getByRole("button", { name: "Refund", exact: true }).click();
    await tx.getByLabel(/Amount/).fill("4000");
    assert(await tx.getByRole("button", { name: "Refund", exact: true }).isDisabled(), "allowed more than paid");
    await tx.getByLabel(/Amount/).fill("3550");
    await tx.getByLabel("Reason").fill("Changed their mind within 24 hours");
    await tx.getByRole("button", { name: "Refund", exact: true }).click();
    await dlg.getByText(/Refund of ₦3,550 recorded/).waitFor({ timeout: 10000 });
    await a.page.keyboard.press("Escape");
    await a.page.getByRole("button", { name: /Chinedu Payer/ }).click();
    await dlg.getByText("Called 12 Oct, asked for refund").waitFor({ timeout: 10000 });
    const s = await state();
    await a.ctx.close();
    assert(s.user_payments[0].status === "refunded" && s.user_payments[0].refund_amount === 3550, JSON.stringify(s.user_payments));
    assert(s.profiles.find((p) => p.email === "payer@example.com").payment_status === "unpaid", "paid features kept");
    assert(s.notes.length === 1, "note not saved");
    return "note kept; card refund explains missing key; transfer refunded and paid features removed";
  });

  await check("Withdrawals: member requests from the wallet, owner pays it, fee recorded", async () => {
    await reset();
    await seedAdmin();
    const m = await member("earner@example.com", "Ifeoma Earner");
    await insert("wallets", { id: "w1", user_id: m.id, balance: 5000, escrow_balance: 0, total_earned: 5000, total_withdrawn: 0 });
    const a = await login(browser, "earner@example.com", MOBILE);
    await a.page.goto(`${BASE}/wallet`, { waitUntil: "networkidle" });
    await a.page.getByRole("button", { name: "Withdraw", exact: true }).click();
    await a.page.getByLabel("Amount (₦)").fill("6000");
    await a.page.getByLabel("Bank", { exact: true }).fill("Opay");
    await a.page.getByLabel("Account number").fill("8031234567");
    await a.page.getByLabel("Name on the account").fill("Ifeoma Earner");
    await a.page.getByRole("button", { name: "Request withdrawal" }).click();
    await a.page.getByText("That's more than your balance.").waitFor();
    await a.page.getByLabel("Amount (₦)").fill("3000");
    await a.page.getByText(/You'll receive ₦2,940/).waitFor();
    await a.page.getByRole("button", { name: "Request withdrawal" }).click();
    await a.page.getByText(/Request sent/).waitFor({ timeout: 10000 });
    await a.page.screenshot({ path: path.join(OUT, "wallet-withdraw-mobile.png"), fullPage: true });
    await a.ctx.close();

    const o = await login(browser, "boss@example.com");
    await o.page.goto(`${BASE}/admin/withdrawals`, { waitUntil: "networkidle" });
    await o.page.getByText(/Opay/).waitFor({ timeout: 10000 });
    await o.page.getByRole("button", { name: "Mark as paid" }).click();
    await o.page.getByRole("button", { name: "Confirm" }).click();
    await o.page.getByText(/Marked as paid/).waitFor({ timeout: 10000 });
    const s = await state();
    await o.ctx.close();
    assert(s.wallets[0].balance === 2000 && s.withdrawals[0].fee_charged === 60 && s.withdrawals[0].net_amount === 2940, JSON.stringify([s.wallets[0], s.withdrawals[0]]));
    return "₦3,000 paid: wallet ₦2,000 left, ₦60 fee, ₦2,940 sent";
  });

  await check("Renewals: plans ending soon get a pre-written WhatsApp message", async () => {
    await reset();
    await seedAdmin();
    await member("hs@example.com", "Bola Makeup", { is_home_service_provider: true, phone_number: "08022223333", subscription_expires_at: new Date(Date.now() + 3 * 86400000 + 3600000).toISOString() });
    await member("old@example.com", "Gone Long", { is_home_service_provider: true, subscription_expires_at: new Date(Date.now() - 90 * 86400000).toISOString() });
    const a = await login(browser, "boss@example.com");
    await a.page.goto(`${BASE}/admin/renewals`, { waitUntil: "networkidle" });
    await a.page.getByText("Bola Makeup").waitFor({ timeout: 10000 });
    const href = await a.page.getByRole("link", { name: "WhatsApp" }).getAttribute("href");
    const text = await a.page.locator("main").innerText();
    await a.ctx.close();
    assert(/wa\.me\/2348022223333\?text=.*ends%20in%204%20days|ends%20in%203%20days/.test(href), href);
    assert(!/Gone Long/.test(text), "90-day-old plan listed");
    return "listed with a ready WhatsApp message; long-expired plans left out";
  });

  await check("Data requests: member asks for a copy, owner downloads it and marks it done", async () => {
    await reset();
    await seedAdmin();
    await member("privacy@example.com", "Ngozi Private");
    const m = await login(browser, "privacy@example.com");
    await m.page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
    await m.page.getByRole("button", { name: "Get a copy of my data" }).click();
    await m.page.getByText(/We'll email you a copy/).waitFor({ timeout: 10000 });
    await m.page.getByRole("button", { name: "Copy requested" }).waitFor();
    await m.ctx.close();

    const o = await login(browser, "boss@example.com");
    await o.page.goto(`${BASE}/admin/data-requests`, { waitUntil: "networkidle" });
    await o.page.getByText(/Copy of their data · Ngozi Private/).waitFor({ timeout: 10000 });
    const [dl] = await Promise.all([o.page.waitForEvent("download"), o.page.getByRole("button", { name: "Download their data" }).click()]);
    const data = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
    await o.page.getByRole("button", { name: "Mark done" }).click();
    await o.page.getByText("Marked done.").waitFor({ timeout: 10000 });
    const s = await state();
    await o.ctx.close();
    assert(data.profile?.email === "privacy@example.com", "export missing profile");
    assert(s.data_requests[0].status === "done", "not done");
    return `export has profile + ${Object.keys(data).length - 2} sections; request closed`;
  });

  await check("Delete account: erases details and the old password stops working", async () => {
    await reset();
    await seedAdmin();
    await member("leaving@example.com", "Femi Leaving");
    const o = await login(browser, "boss@example.com");
    await o.page.goto(`${BASE}/admin/users?q=leaving`, { waitUntil: "networkidle" });
    await o.page.getByRole("button", { name: /Femi Leaving/ }).click();
    const dlg = o.page.getByRole("dialog");
    await dlg.getByRole("button", { name: "Delete account" }).click();
    const go = dlg.getByRole("button", { name: "Delete account" }).last();
    assert(await go.isDisabled(), "delete without typing DELETE");
    await dlg.getByLabel("Type DELETE to confirm").fill("DELETE");
    await go.click();
    await dlg.getByText(/Account deleted/).waitFor({ timeout: 10000 });
    await o.ctx.close();
    const s = await state();
    const p = s.profiles.find((x) => x.full_name === "Deleted member");
    assert(p && !p.email && !p.phone_number && p.account_status === "suspended", JSON.stringify(p));
    const tok = await post("/auth/v1/token?grant_type=password", { email: "leaving@example.com", password: "lagos2026" });
    assert(!tok.access_token, "old login still works");
    return "name, email, phone removed; login closed";
  });

  await check("Members: filters live in the address bar and saved views survive a reload", async () => {
    await reset();
    await seedAdmin();
    await member("s1@example.com", "Stuck Person", { account_status: "pending_payment" });
    const a = await login(browser, "boss@example.com");
    await a.page.goto(`${BASE}/admin/users?status=stuck`, { waitUntil: "networkidle" });
    await a.page.getByText("Stuck Person").waitFor({ timeout: 10000 });
    assert((await a.page.getByLabel("Status").inputValue()) === "stuck", "filter not read from URL");
    assert(!/Ada Admin/.test(await a.page.locator("tbody").innerText()), "filter not applied");
    await a.page.getByRole("button", { name: "+ Save this view" }).click();
    await a.page.getByLabel("View name").fill("Chase these");
    await a.page.getByRole("button", { name: "Save", exact: true }).click();
    await a.page.goto(`${BASE}/admin/users`, { waitUntil: "networkidle" });
    await a.page.getByRole("button", { name: "Chase these", exact: true }).click();
    await a.page.waitForURL(/status=stuck/);
    await a.page.getByRole("button", { name: "Stuck this week" }).waitFor();
    await a.ctx.close();
    return "?status=stuck applied on load; custom view saved and reapplied";
  });

  await check("Broadcasts reach the right members as a banner they can close", async () => {
    await reset();
    await seedAdmin();
    await member("art@example.com", "Art Isan", { is_artisan: true });
    await member("cli@example.com", "Cli Ent", { is_artisan: false, is_client: true });
    const o = await login(browser, "boss@example.com");
    await o.page.goto(`${BASE}/admin/broadcasts`, { waitUntil: "networkidle" });
    await o.page.getByLabel("Title").fill("New jobs in Ikeja");
    await o.page.getByLabel("Message").fill("Ten shops are hiring cashiers this week.");
    await o.page.getByLabel("Who sees it").selectOption("artisan");
    await o.page.getByRole("button", { name: "Send broadcast" }).click();
    await o.page.getByRole("button", { name: "Send now" }).click();
    await o.page.getByText(/Sent\. Artisans/).waitFor({ timeout: 10000 });
    await o.ctx.close();

    const art = await login(browser, "art@example.com", MOBILE);
    await art.page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    await art.page.getByRole("region", { name: "Announcement" }).getByText("New jobs in Ikeja").waitFor({ timeout: 10000 });
    await art.page.getByRole("button", { name: "Close announcement" }).click();
    await art.page.reload({ waitUntil: "networkidle" });
    const still = await art.page.getByText("New jobs in Ikeja").count();
    await art.ctx.close();
    const cli = await login(browser, "cli@example.com", MOBILE);
    await cli.page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    await cli.page.waitForTimeout(800);
    const seenByClient = await cli.page.getByText("New jobs in Ikeja").count();
    await cli.ctx.close();
    assert(still === 0, "banner came back after closing");
    assert(seenByClient === 0, "client saw an artisan broadcast");
    return "artisan sees it and can close it; client doesn't";
  });

  await check("Bookings and ID checks screens load; disputes stand out", async () => {
    await reset();
    await seedAdmin();
    const c = await member("client@example.com", "Halima Client");
    const p = await member("pro@example.com", "Yemi Pro");
    await insert("bookings", { id: "bk-0001-aaaa", client_id: c.id, provider_id: p.id, status: "disputed", total_amount: 15000, service_amount: 12000, transport_fee: 2000, platform_fee: 1000, dispute_reason: "Didn't show up", paid_at: new Date().toISOString(), scheduled_at: new Date().toISOString() });
    const a = await login(browser, "boss@example.com");
    await a.page.goto(`${BASE}/admin/bookings`, { waitUntil: "networkidle" });
    await a.page.getByText("Halima Client → Yemi Pro").click();
    await a.page.getByText("Dispute: Didn't show up").waitFor({ timeout: 10000 });
    const tiles = await a.page.locator("dl").innerText();
    await a.page.goto(`${BASE}/admin/verifications`, { waitUntil: "networkidle" });
    await a.page.getByRole("heading", { name: "ID checks" }).waitFor();
    await a.ctx.close();
    assert(/Open disputes\s*1/.test(tiles), tiles);
    return "dispute shown with reason; ID checks page renders";
  });

  await check("New admin pages pass axe (WCAG 2.2 AA)", async () => {
    await reset();
    await seedAdmin();
    const a = await login(browser, "boss@example.com");
    const bad = [];
    for (const pth of ["/admin/moderation", "/admin/team", "/admin/risk", "/admin/withdrawals", "/admin/renewals", "/admin/data-requests", "/admin/security", "/admin/broadcasts", "/admin/bookings"]) {
      await a.page.goto(`${BASE}${pth}`, { waitUntil: "networkidle" });
      await a.page.waitForTimeout(400);
      const r = await new AxeBuilder({ page: a.page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      for (const v of r.violations) bad.push(`${pth}: ${v.id}(${v.nodes.length})`);
    }
    await a.ctx.close();
    assert(!bad.length, bad.join(", "));
    return "9 pages, 0 violations";
  });

  await browser.close();
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  — ${r.detail}` : ""}`);
  console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed`);
  process.exit(results.every((r) => r.ok) ? 0 : 1);
})();
