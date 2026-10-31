// Signup with payment before entry (build with NEXT_PUBLIC_FREE_SIGNUP=false),
// against tests/mock-supabase/server.js.
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
const reset = () => fetch(`${MOCK}/__mock/reset`);
const state = () => fetch(`${MOCK}/__mock/state`).then((r) => r.json());
const FAKE_PAYSTACK =
  "window.PaystackPop={setup:function(o){return{openIframe:function(){window.__paystack=o;setTimeout(function(){fetch('http://localhost:54321/__mock/webhook').then(function(){o.callback({reference:o.ref})})},300)}}}};";

async function start(browser) {
  const ctx = await browser.newContext(MOBILE);
  const page = await ctx.newPage();
  await page.route(/supabase\.co|googleapis|gstatic/, (r) => r.fulfill({ status: 204, body: "" }));
  await page.route("https://js.paystack.co/**", (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE_PAYSTACK }));
  return { ctx, page };
}
async function account(page, email, url = `${BASE}/signup?role=artisan`) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByLabel("Full name").fill("Ada Okafor");
  await page.getByLabel("Phone number").fill("08031234567");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Create a password").fill("lagos2026");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("State").selectOption("Lagos");
  await page.getByLabel("City or town").selectOption("Ikeja");
}

(async () => {
  const browser = await chromium.launch();

  await check("Paid mode: artisan pays by card at step 5 and lands on 'You're in'", async () => {
    await reset();
    const { ctx, page } = await start(browser);
    await account(page, "card@example.com");
    await page.getByRole("button", { name: "Next: your skills" }).click();
    await page.getByRole("button", { name: /^Plumbing/ }).click();
    await page.getByRole("button", { name: "Next: payment" }).click();
    await page.getByText("Step 5 of 5").waitFor({ timeout: 10000 });
    const pageText = await page.locator("main").textContent();
    assert(!/guarantee|20 opportunities|email alerts/i.test(pageText), "false promises still on the payment page");
    await page.screenshot({ path: path.join(OUT, "paid-signup-payment-mobile.png"), fullPage: true });
    await page.getByRole("button", { name: "Pay ₦3,550" }).click();
    await page.getByRole("heading", { name: "You're in" }).waitFor({ timeout: 20000 });
    const st = await state();
    await ctx.close();
    assert(st.profiles[0].account_status === "active" && st.profiles[0].payment_status === "verified", JSON.stringify(st.profiles[0]).slice(0, 100));
    return "₦3,550 by card → webhook → active";
  });

  await check("Paid mode: closing Paystack charges nothing and says so", async () => {
    await reset();
    const { ctx, page } = await start(browser);
    await page.route("https://js.paystack.co/**", (r) =>
      r.fulfill({ status: 200, contentType: "application/javascript", body: "window.PaystackPop={setup:function(o){return{openIframe:function(){setTimeout(function(){o.onClose()},200)}}}};" }),
    );
    await account(page, "close@example.com");
    await page.getByRole("button", { name: "Next: your skills" }).click();
    await page.getByRole("button", { name: /^Plumbing/ }).click();
    await page.getByRole("button", { name: "Next: payment" }).click();
    await page.getByRole("button", { name: "Pay ₦3,550" }).click();
    const t = await page.locator("main [role=alert]").first().textContent();
    await ctx.close();
    assert(/Nothing was charged/.test(t), t);
    return t.trim();
  });

  await check("Paid mode: bank transfer goes to the pending page with amount and reference", async () => {
    await reset();
    const { ctx, page } = await start(browser);
    await account(page, "transfer@example.com");
    await page.getByRole("button", { name: "Next: your skills" }).click();
    await page.getByRole("button", { name: /^Plumbing/ }).click();
    await page.getByRole("button", { name: "Next: payment" }).click();
    await page.getByRole("radio", { name: /Bank transfer/ }).click();
    await page.getByRole("button", { name: "I've sent ₦3,550" }).click();
    await page.waitForURL(/\/signup\/pending/, { timeout: 15000 });
    await page.getByRole("heading", { name: "We're checking your transfer" }).waitFor({ timeout: 10000 });
    const text = await page.locator("main").textContent();
    await page.screenshot({ path: path.join(OUT, "paid-pending-mobile.png"), fullPage: true });
    await ctx.close();
    assert(/₦3,550/.test(text) && /S9-[0-9A-F]{8}/.test(text), "amount or reference missing");
    return "pending page shows ₦3,550 and the S9- reference";
  });

  await check("Paid mode: home-service plan prices come from settings", async () => {
    await reset();
    const { ctx, page } = await start(browser);
    await account(page, "hs@example.com", `${BASE}/signup?mode=homeservice`);
    await page.getByRole("button", { name: "Next: your services" }).click();
    await page.getByRole("button", { name: "Makeup" }).click();
    await page.getByRole("button", { name: "Hairdressing" }).click();
    await page.getByRole("button", { name: "Next: choose a plan" }).click();
    const growth = await page.getByRole("radio", { name: /Growth/ }).textContent();
    const business = await page.getByRole("radio", { name: /Business/ }).textContent();
    await page.getByRole("radio", { name: /Business/ }).click();
    await page.getByRole("button", { name: "Next: payment" }).click();
    const total = await page.getByLabel("Order summary").textContent();
    await ctx.close();
    assert(/₦2,000\/month/.test(growth) && /₦7,000\/month/.test(business), `${growth} | ${business}`);
    assert(/₦7,000/.test(total) && /2 services/.test(total), total);
    return "2 services: Growth ₦2,000, Business ₦7,000; summary matches";
  });

  await browser.close();
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  — ${r.detail}` : ""}`);
  console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed`);
})();
