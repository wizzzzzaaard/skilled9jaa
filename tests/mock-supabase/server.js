// A small stand-in for Supabase (auth, REST, RPC, storage) so the whole
// signup and payment flow can be tested end to end with a real session,
// without touching the live project. Start: node tests/mock-supabase/server.js
// Build the app against it with NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
const http = require("http");
const crypto = require("crypto");

const PORT = Number(process.env.MOCK_PORT || 54321);
const CONFIRM_EMAIL = process.env.MOCK_CONFIRM_EMAIL === "1";

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");

const EMPLOYER_ID = "00000000-0000-4000-8000-00000000e001";
function seedJobs() {
  const jobs = [];
  for (let i = 1; i <= 25; i++) {
    const n = String(i).padStart(2, "0");
    jobs.push({
      id: `job-${n}`,
      employer_id: EMPLOYER_ID,
      title: i === 1 ? "Cashier" : i === 2 ? "Front desk officer" : `Sales rep ${n}`,
      description: "Serve customers, handle cash and keep the shop tidy. Monday to Saturday, 8am to 5pm.",
      requirements: "SSCE or higher.",
      job_type: i % 2 ? "Full-time" : "Part-time",
      state: i <= 3 ? "Federal Capital Territory" : "Lagos",
      city: i <= 3 ? "Garki" : "Ikeja",
      location: null,
      salary_min: i === 1 ? 80000 : 50000,
      salary_max: i === 1 ? 150000 : 70000,
      salary_period: "monthly",
      status: "active",
      requires_cv: i === 1,
      requires_photo: false,
      requires_nin: false,
      requires_age_proof: false,
      application_deadline: i === 25 ? "2020-01-01T23:59:59Z" : null,
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
    });
  }
  return jobs;
}

function seed() {
  return {
    users: {}, // id -> { id, email, password, user_metadata }
    tokens: {}, // token -> user id
    tables: {
      profiles: [],
      skills: [
        { id: 1, name: "Plumbing", type: "SKILL" },
        { id: 2, name: "Electrician", type: "SKILL" },
        { id: 3, name: "Lawyer (Property)", type: "JOB" },
        { id: 4, name: "Lawyer (Corporate)", type: "JOB" },
        { id: 5, name: "Lawyer (Family)", type: "JOB" },
        { id: 6, name: "Cashier", type: "JOB" },
        { id: 7, name: "Web Design", type: "SKILL" },
        { id: 8, name: "Tailoring (Menswear)", type: "SKILL" },
      ],
      user_skills: [],
      home_service_categories: [
        { id: "c1", name: "Makeup", is_active: true, display_order: 1 },
        { id: "c2", name: "Hairdressing", is_active: true, display_order: 2 },
        { id: "c3", name: "Photographer", is_active: true, display_order: 3 },
      ],
      provider_service_options: [],
      platform_settings: [
        {
          id: 1,
          skilled9ja_display_price: 3550,
          skilled9ja_slash_price: 5950,
          home_growth_price: 1000,
          home_business_price: 5000,
          home_unlimited_price: 10000,
          paystack_enabled: true,
          manual_payment_enabled: true,
          paystack_public_key: "pk_test_mock",
          withdrawal_fee_pct: 2,
        },
      ],
      payment_details: [{ id: 1, bank_name: "Test Bank", account_number: "0123456789", account_name: "Skilled9ja Ltd", is_active: true }],
      orders: [],
      user_payments: [],
      posts: [],
      jobs: seedJobs(),
      job_perks: [
        { job_id: "job-01", perk_id: "p1" },
        { job_id: "job-02", perk_id: "p2" },
        { job_id: "job-03", perk_id: "p1" },
      ],
      job_applications: [],
      verifications: [],
      admin_audit_log: [],
      content_reports: [],
      admin_notes: [],
      data_requests: [],
      withdrawal_requests: [],
      wallets: [],
      wallet_transactions: [],
      bookings: [],
      broadcasts: [],
      perks: [
        { id: "p1", name: "Feeding" },
        { id: "p2", name: "Accommodation" },
      ],
    },
    log: [],
  };
}
let db = seed();
function addEmployer() {
  const u = { id: EMPLOYER_ID, email: "employer@example.com", password: "lagos2026", user_metadata: { full_name: "Ngozi Eze", is_company: true, is_client: true } };
  db.users[u.id] = u;
  createProfile(u);
  Object.assign(db.tables.profiles[db.tables.profiles.length - 1], { account_status: "active", active_mode: "company", company_name: "Garki Mart Ltd", state: "Federal Capital Territory", city: "Garki" });
}

function session(user, aal = "aal1") {
  // A real JWT header, so supabase-js can decode it (two-step login reads the "aal" claim).
  const token = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: user.id, email: user.email, role: "authenticated", aal, amr: [{ method: aal === "aal2" ? "totp" : "password", timestamp: Math.floor(Date.now() / 1000) }], exp: Math.floor(Date.now() / 1000) + 3600, n: uid() })}.sig`;
  db.tokens[token] = user.id;
  return {
    access_token: token,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: `r-${token}`,
    user: publicUser(user),
  };
}
function publicUser(u) {
  return {
    id: u.id,
    aud: "authenticated",
    role: "authenticated",
    email: u.email,
    email_confirmed_at: now(),
    identities: [{ id: u.id, provider: "email" }],
    user_metadata: u.user_metadata,
    app_metadata: { provider: "email" },
    factors: u.factors || [],
    created_at: now(),
  };
}
function userFrom(req) {
  const h = req.headers.authorization || "";
  const t = h.replace(/^Bearer\s+/i, "");
  const id = db.tokens[t];
  return id ? db.users[id] : null;
}

// The handle_new_user trigger
function createProfile(u) {
  const m = u.user_metadata || {};
  db.tables.profiles.push({
    id: u.id,
    email: u.email,
    full_name: m.full_name || "",
    phone_number: m.phone_number || "",
    is_client: m.is_client ?? true,
    is_artisan: !!m.is_artisan,
    is_home_service_provider: !!m.is_home_service_provider,
    is_company: !!m.is_company,
    is_admin: false,
    is_mock: false,
    account_status: "incomplete",
    payment_status: "unpaid",
    active_mode: "client",
    signup_step: 1,
    signup_niche: m.signup_niche || null,
    utm_source: m.utm_source || null,
    state: null,
    city: null,
    lga: null,
    bio: null,
    latitude: null,
    longitude: null,
    profile_image_url: null,
    company_name: null,
    industry: null,
    subscription_expires_at: null,
    verification_status: "unverified",
    created_at: now(),
  });
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,HEAD,OPTIONS,PUT",
    "Access-Control-Expose-Headers": "Content-Range",
    ...headers,
  });
  res.end(body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body));
}

function parseValue(v) {
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null") return null;
  return v;
}
function matches(row, params) {
  for (const [key, raw] of params) {
    if (["select", "order", "limit", "offset", "on_conflict", "columns"].includes(key)) continue;
    const val = row[key];
    const [op, ...rest] = raw.split(".");
    const arg = rest.join(".");
    if (op === "eq" && String(val) !== String(parseValue(arg))) return false;
    if (op === "neq" && String(val) === String(parseValue(arg))) return false;
    if (op === "is" && !(arg === "null" ? val == null : val === parseValue(arg))) return false;
    if (op === "not" && rest[0] === "is" && rest[1] === "null" && val == null) return false;
    if (key === "job_perks.perk_id") {
      const ids = arg.replace(/^\(|\)$/g, "").split(",");
      if (!db.tables.job_perks.some((jp) => jp.job_id === row.id && ids.includes(jp.perk_id))) return false;
      continue;
    }
    if (op === "ilike") {
      // SQL ILIKE: % (or * in PostgREST) matches anything.
      const re = new RegExp(`^${arg.split(/[%*]/).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`, "is");
      if (!re.test(String(val ?? ""))) return false;
      continue;
    }
    if (key === "or") {
      // or=(a.ilike.%x%,b.eq.y): passes when any clause matches.
      const clauses = arg ? `${op}.${arg}` : op;
      const parts = clauses.replace(/^\(|\)$/g, "").split(",");
      if (!parts.some((c) => { const i = c.indexOf("."); return matches(row, [[c.slice(0, i), c.slice(i + 1)]]); })) return false;
      continue;
    }
    const num = (x) => x !== null && x !== "" && !isNaN(Number(x));
    const cmp = (a, b) => (num(a) && num(b) ? Number(a) - Number(b) : (String(a ?? "") < String(b) ? -1 : String(a ?? "") > String(b) ? 1 : 0));
    if (op === "gte" && !(val != null && cmp(val, arg) >= 0)) return false;
    if (op === "lte" && !(val != null && cmp(val, arg) <= 0)) return false;
    if (op === "in") {
      const list = arg.replace(/^\(|\)$/g, "").split(",");
      if (!list.includes(String(val))) return false;
    }
  }
  return true;
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : null);
      } catch {
        resolve(data);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204);
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;
  const body = ["POST", "PATCH", "PUT"].includes(req.method) ? await readBody(req) : null;
  db.log.push({ method: req.method, path: p, query: url.search, body });

  // ── test controls ──
  if (p === "/__mock/reset") {
    db = seed();
    addEmployer();
    return send(res, 200, { ok: true });
  }
  if (p === "/__mock/state") return send(res, 200, { profiles: db.tables.profiles.filter((x) => x.id !== EMPLOYER_ID), employer: db.tables.profiles.find((x) => x.id === EMPLOYER_ID), user_skills: db.tables.user_skills, orders: db.tables.orders, user_payments: db.tables.user_payments, provider_service_options: db.tables.provider_service_options, job_applications: db.tables.job_applications, jobs: db.tables.jobs, audit: db.tables.admin_audit_log, reports: db.tables.content_reports, posts: db.tables.posts, data_requests: db.tables.data_requests, withdrawals: db.tables.withdrawal_requests, wallets: db.tables.wallets, notes: db.tables.admin_notes, broadcasts: db.tables.broadcasts });
  if (p === "/__mock/log") return send(res, 200, db.log);
  if (p === "/__mock/webhook") {
    // Simulates the Paystack webhook for the newest pending order.
    const order = [...db.tables.orders].reverse().find((o) => o.status === "pending");
    if (!order) return send(res, 404, { error: "no order" });
    order.status = "verified";
    const prof = db.tables.profiles.find((x) => x.id === order.user_id);
    if (prof) {
      prof.payment_status = "verified";
      prof.account_status = "active";
      if (order.order_type.startsWith("home_")) prof.subscription_expires_at = new Date(Date.now() + 30 * 864e5).toISOString();
    }
    return send(res, 200, order);
  }
  if (p === "/__mock/insert") {
    const t = db.tables[body.table];
    if (!t) return send(res, 404, { error: "no table" });
    const rows = (Array.isArray(body.rows) ? body.rows : [body.rows]).map((r, i) => ({ id: r.id ?? (typeof t[0]?.id === "string" ? uid() : t.length + i + 1), created_at: now(), ...r }));
    t.push(...rows);
    return send(res, 200, rows);
  }
  if (p === "/__mock/set-user") {
    const u = Object.values(db.users).find((x) => x.email === body.email);
    if (u) Object.assign(u, body.patch);
    return send(res, u ? 200 : 404, u || {});
  }
  if (p === "/__mock/set-profile") {
    const prof = db.tables.profiles.find((x) => x.email === body.email);
    if (prof) Object.assign(prof, body.patch);
    return send(res, prof ? 200 : 404, prof || {});
  }

  // ── auth ──
  if (p === "/auth/v1/signup" && req.method === "POST") {
    const exists = Object.values(db.users).find((u) => u.email === body.email);
    if (exists) return send(res, 422, { code: 422, error_code: "user_already_exists", msg: "User already registered" });
    const u = { id: uid(), email: body.email, password: body.password, user_metadata: (body.data || body.options?.data || {}) };
    db.users[u.id] = u;
    createProfile(u);
    if (CONFIRM_EMAIL) return send(res, 200, publicUser(u));
    return send(res, 200, session(u));
  }
  if (p === "/auth/v1/token" && req.method === "POST") {
    const grant = url.searchParams.get("grant_type");
    if (grant === "password") {
      const u = Object.values(db.users).find((x) => x.email === body.email && x.password === body.password);
      if (!u) return send(res, 400, { error: "invalid_grant", error_description: "Invalid login credentials", msg: "Invalid login credentials" });
      return send(res, 200, session(u));
    }
    if (grant === "refresh_token") {
      const t = String(body.refresh_token || "").replace(/^r-/, "");
      const id = db.tokens[t];
      if (!id) return send(res, 400, { error: "invalid_grant", msg: "Invalid Refresh Token" });
      return send(res, 200, session(db.users[id]));
    }
  }
  if (p === "/auth/v1/user") {
    const u = userFrom(req);
    if (!u) return send(res, 401, { code: 401, msg: "invalid JWT" });
    return send(res, 200, publicUser(u));
  }
  if (p === "/auth/v1/logout") return send(res, 204);

  // ── two-step login (TOTP). The stand-in authenticator accepts code 123456. ──
  const factorMatch = p.match(/^\/auth\/v1\/factors(?:\/([^/]+))?(?:\/(challenge|verify))?$/);
  if (factorMatch) {
    const u = userFrom(req);
    if (!u) return send(res, 401, { code: 401, msg: "invalid JWT" });
    u.factors = u.factors || [];
    const [, fid, step] = factorMatch;
    if (!fid && req.method === "POST") {
      const f = { id: uid(), friendly_name: body.friendly_name, factor_type: "totp", status: "unverified", created_at: now(), updated_at: now() };
      u.factors.push(f);
      return send(res, 200, { id: f.id, type: "totp", friendly_name: f.friendly_name, totp: { qr_code: "<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'/>", secret: "MOCKSECRET234567", uri: "otpauth://totp/mock" } });
    }
    const f = u.factors.find((x) => x.id === fid);
    if (!f) return send(res, 404, { code: 404, msg: "factor not found" });
    if (req.method === "DELETE") {
      u.factors = u.factors.filter((x) => x.id !== fid);
      return send(res, 200, { id: fid });
    }
    if (step === "challenge") return send(res, 200, { id: uid(), type: "totp", expires_at: Math.floor(Date.now() / 1000) + 300 });
    if (step === "verify") {
      if (body.code !== "123456") return send(res, 422, { code: 422, error_code: "mfa_verification_failed", msg: "Invalid TOTP code entered" });
      f.status = "verified";
      return send(res, 200, session(u, "aal2"));
    }
  }

  // ── edge function used by Admin › Payments ──
  if (p === "/functions/v1/admin-payments") {
    const u = userFrom(req);
    const prof = u && db.tables.profiles.find((x) => x.id === u.id);
    if (!prof?.is_admin) return send(res, 403, { error: "Forbidden" });
    const withProfile = (rows) => rows.map((r) => ({ ...r, profiles: (({ full_name, email, account_status }) => ({ full_name, email, account_status }))(db.tables.profiles.find((x) => x.id === r.user_id) || {}) }));
    if (body?.action === "fetch_manual") return send(res, 200, { data: withProfile(db.tables.user_payments) });
    if (body?.action === "fetch_orders") return send(res, 200, { data: withProfile(db.tables.orders) });
    return send(res, 400, { error: "Unknown action" });
  }

  // ── admin-actions edge function (mirrors supabase/functions/admin-actions) ──
  if (p === "/functions/v1/admin-actions") {
    const u = userFrom(req);
    if (!u) return send(res, 401, { error: "Unauthorized" });
    const me = db.tables.profiles.find((x) => x.id === u.id);
    if (!me?.is_admin) return send(res, 403, { error: "Forbidden" });
    const tok = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    let aal = "aal1";
    try { aal = JSON.parse(Buffer.from(tok.split(".")[1], "base64url").toString()).aal; } catch {}
    const hasFactor = (u.factors || []).some((f) => f.status === "verified");
    if (hasFactor && aal !== "aal2") return send(res, 403, { error: "Confirm your sign-in with your authenticator app first.", needsMfa: true });
    const role = me.admin_role || "owner";
    const OWNER_ONLY = ["mark_paid", "refund", "process_withdrawal", "list_withdrawals", "list_data_requests", "export_member", "delete_member", "resolve_data_request", "set_admin_role"];
    if (OWNER_ONLY.includes(body?.action) && role !== "owner") return send(res, 403, { error: "Only an owner admin can do this." });
    const T = db.tables;
    const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim().slice(0, 300) : null;
    const audit = (target_type, target_id, detail) =>
      T.admin_audit_log.push({ id: T.admin_audit_log.length + 1, created_at: now(), admin_id: me.id, action: body.action, target_type, target_id, detail, reason });
    const STUCK = ["incomplete", "pending_payment", "pending_manual"];
    const person = (id) => T.profiles.find((x) => x.id === id);
    switch (body?.action) {
      case "whoami": return send(res, 200, { role, mfa: hasFactor, aal });
      case "set_user_status": {
        if (!["active", "suspended"].includes(body.status)) return send(res, 400, { error: "Unknown status" });
        if (body.user_id === me.id) return send(res, 400, { error: "You can't change your own account here" });
        const t = person(body.user_id);
        if (!t) return send(res, 404, { error: "Member not found" });
        if (t.is_admin && role !== "owner") return send(res, 403, { error: "Only an owner can suspend another admin." });
        const from = t.account_status;
        t.account_status = body.status;
        audit("profile", t.id, { from, to: body.status });
        return send(res, 200, { ok: true });
      }
      case "let_in": {
        const ids = (body.user_ids || []).slice(0, 500);
        if (!ids.length) return send(res, 400, { error: "No members chosen" });
        const rows = T.profiles.filter((x) => ids.includes(x.id) && STUCK.includes(x.account_status));
        rows.forEach((x) => { x.account_status = "active"; x.signup_step = 6; });
        audit("profiles", `${rows.length} members`, { ids: rows.map((x) => x.id) });
        return send(res, 200, { ok: true, updated: rows.length });
      }
      case "add_note": {
        const text = String(body.body || "").trim().slice(0, 2000);
        if (!text) return send(res, 400, { error: "Write a note first" });
        const note = { id: T.admin_notes.length + 1, created_at: now(), member_id: body.user_id, admin_id: me.id, body: text };
        T.admin_notes.push(note);
        return send(res, 200, { ok: true, note: { ...note, admin_name: me.full_name } });
      }
      case "list_notes":
        return send(res, 200, { data: T.admin_notes.filter((n) => n.member_id === body.user_id).reverse().map((n) => ({ ...n, admin_name: person(n.admin_id)?.full_name || "Admin" })) });
      case "set_admin_role": {
        if (body.role !== null && !["owner", "support"].includes(body.role)) return send(res, 400, { error: "Unknown role" });
        if (body.user_id === me.id) return send(res, 400, { error: "You can't change your own admin role" });
        const t = person(body.user_id);
        if (!t) return send(res, 404, { error: "Member not found" });
        const from = t.is_admin ? t.admin_role || "owner" : "member";
        if (body.role) { t.is_admin = true; t.admin_role = body.role; } else { t.is_admin = false; t.admin_role = null; }
        audit("profile", t.id, { from, to: body.role || "member" });
        return send(res, 200, { ok: true });
      }
      case "mark_paid": {
        const t = person(body.user_id);
        if (!t) return send(res, 404, { error: "Member not found" });
        t.payment_status = "verified";
        T.user_payments.filter((x) => x.user_id === t.id && x.status === "pending").forEach((x) => (x.status = "approved"));
        audit("profile", t.id, { payment_status: "verified" });
        return send(res, 200, { ok: true });
      }
      case "refund": {
        const kind = body.kind;
        const table = kind === "card" ? T.orders : kind === "transfer" ? T.user_payments : null;
        if (!table) return send(res, 400, { error: "Choose a payment to refund" });
        if (!reason) return send(res, 400, { error: "A reason is required for refunds" });
        const pay = table.find((x) => String(x.id) === String(body.id));
        if (!pay) return send(res, 404, { error: "Payment not found" });
        if (pay.status === "refunded") return send(res, 400, { error: "Already refunded" });
        if (!["verified", "approved"].includes(pay.status)) return send(res, 400, { error: "Only completed payments can be refunded" });
        if (kind === "card" && !process.env.MOCK_PAYSTACK_SECRET) return send(res, 400, { error: "Paystack isn't connected to this function yet (PAYSTACK_SECRET_KEY)." });
        const amount = Math.min(Number(body.amount ?? pay.amount) || Number(pay.amount), Number(pay.amount));
        Object.assign(pay, { status: "refunded", refunded_at: now(), refund_amount: amount });
        if (body.revoke === true) Object.assign(person(pay.user_id) || {}, { payment_status: "unpaid", is_published: false });
        audit(kind === "card" ? "order" : "transfer", String(pay.id), { user_id: pay.user_id, amount, revoked: body.revoke === true });
        return send(res, 200, { ok: true });
      }
      case "list_withdrawals": {
        const ids = [...new Set(T.withdrawal_requests.map((w) => w.user_id))];
        return send(res, 200, { data: [...T.withdrawal_requests].reverse(), people: T.profiles.filter((x) => ids.includes(x.id)), wallets: T.wallets.filter((w) => ids.includes(w.user_id)) });
      }
      case "process_withdrawal": {
        const w = T.withdrawal_requests.find((x) => Number(x.id) === Number(body.id));
        if (!w) return send(res, 404, { error: "Request not found" });
        if (w.status !== "pending") return send(res, 400, { error: "Already processed" });
        if (body.decision === "rejected") {
          if (!reason) return send(res, 400, { error: "Give the member a reason" });
          Object.assign(w, { status: "rejected", rejection_reason: reason, processed_at: now(), processed_by: me.id });
        } else if (body.decision === "paid") {
          const wallet = T.wallets.find((x) => x.user_id === w.user_id);
          if (!wallet || Number(wallet.balance) < Number(w.amount)) return send(res, 400, { error: "Their wallet balance is lower than this request" });
          const pct = Number(T.platform_settings[0].withdrawal_fee_pct || 0);
          const fee = Math.round(Number(w.amount) * pct) / 100;
          wallet.balance = Number(wallet.balance) - Number(w.amount);
          wallet.total_withdrawn = Number(wallet.total_withdrawn || 0) + Number(w.amount);
          Object.assign(w, { status: "paid", fee_charged: fee, net_amount: Number(w.amount) - fee, processed_at: now(), processed_by: me.id });
        } else return send(res, 400, { error: "Approve or reject" });
        audit("withdrawal", String(w.id), { decision: body.decision, amount: w.amount });
        return send(res, 200, { ok: true });
      }
      case "list_jobs": {
        let rows = T.jobs.filter((j) => (!body.status || j.status === body.status) && (!body.q || j.title.toLowerCase().includes(String(body.q).toLowerCase())));
        const count = rows.length;
        const off = Number(body.offset || 0);
        rows = rows.slice(off, off + 50);
        const ids = [...new Set(rows.map((j) => j.employer_id))];
        const employers = T.profiles.filter((x) => ids.includes(x.id)).map(({ id, company_name, full_name, email }) => ({ id, company_name, full_name, email }));
        return send(res, 200, { data: rows, count, employers });
      }
      case "set_job_status": {
        if (!["active", "closed", "removed"].includes(body.status)) return send(res, 400, { error: "Unknown status" });
        const j = T.jobs.find((x) => x.id === body.job_id);
        if (!j) return send(res, 404, { error: "Job not found" });
        const from = j.status;
        j.status = body.status;
        audit("job", j.id, { title: j.title, from, to: body.status });
        return send(res, 200, { ok: true });
      }
      case "list_reports": {
        const status = ["open", "actioned", "dismissed"].includes(body.status) ? body.status : "open";
        const rows = T.content_reports.filter((r) => r.status === status).reverse();
        const ids = (t) => rows.filter((r) => r.target_type === t).map((r) => String(r.target_id));
        const peopleIds = [...rows.map((r) => r.reporter_id), ...ids("profile")];
        return send(res, 200, {
          data: rows,
          profiles: T.profiles.filter((x) => peopleIds.includes(x.id)),
          jobs: T.jobs.filter((j) => ids("job").includes(String(j.id))),
          posts: T.posts.filter((x) => ids("post").includes(String(x.id))),
          reviews: T.bookings.filter((x) => ids("review").includes(String(x.id))),
        });
      }
      case "resolve_report": {
        if (!["actioned", "dismissed"].includes(body.status)) return send(res, 400, { error: "Unknown outcome" });
        const r = T.content_reports.find((x) => Number(x.id) === Number(body.id));
        if (!r) return send(res, 404, { error: "Report not found" });
        const same = T.content_reports.filter((x) => x.status === "open" && x.target_type === r.target_type && x.target_id === r.target_id);
        same.forEach((x) => Object.assign(x, { status: body.status, resolved_at: now(), resolved_by: me.id, resolution: reason }));
        audit("report", String(r.id), { outcome: body.status, closed: same.length });
        return send(res, 200, { ok: true, closed: same.length });
      }
      case "list_posts": {
        const rows = T.posts.filter((x) => (body.hidden === true ? !!x.hidden_at : !x.hidden_at)).reverse();
        return send(res, 200, { data: rows, people: T.profiles.filter((x) => rows.some((r) => r.user_id === x.id)) });
      }
      case "set_post_hidden": {
        const post = T.posts.find((x) => Number(x.id) === Number(body.id));
        if (!post) return send(res, 404, { error: "Post not found" });
        if (body.hidden === true && !reason) return send(res, 400, { error: "A reason is required to hide a post" });
        Object.assign(post, body.hidden === true ? { hidden_at: now(), hidden_reason: reason } : { hidden_at: null, hidden_reason: null });
        audit("post", String(post.id), { hidden: body.hidden === true });
        return send(res, 200, { ok: true });
      }
      case "list_reviews": {
        const rows = T.bookings.filter((b) => b.client_review);
        return send(res, 200, { data: rows, people: T.profiles.filter((x) => rows.some((b) => b.client_id === x.id || b.provider_id === x.id)) });
      }
      case "set_review_hidden": {
        const bk = T.bookings.find((x) => x.id === body.id);
        if (!bk) return send(res, 404, { error: "Review not found" });
        if (body.hidden === true && !reason) return send(res, 400, { error: "A reason is required to hide a review" });
        bk.review_hidden = body.hidden === true;
        audit("review", bk.id, { hidden: bk.review_hidden });
        return send(res, 200, { ok: true });
      }
      case "list_data_requests":
        return send(res, 200, { data: [...T.data_requests].reverse(), people: T.profiles.filter((x) => T.data_requests.some((r) => r.user_id === x.id)) });
      case "export_member": {
        const t = person(body.user_id);
        if (!t) return send(res, 404, { error: "Member not found" });
        audit("profile", t.id, { exported: true });
        return send(res, 200, { ok: true, data: { exported_at: now(), profile: t, skills: T.user_skills.filter((x) => x.user_id === t.id), card_payments: T.orders.filter((x) => x.user_id === t.id), bank_transfers: T.user_payments.filter((x) => x.user_id === t.id) } });
      }
      case "delete_member": {
        if (body.user_id === me.id) return send(res, 400, { error: "You can't delete your own account here" });
        if (body.confirm !== "DELETE") return send(res, 400, { error: "Type DELETE to confirm" });
        const t = person(body.user_id);
        if (!t) return send(res, 404, { error: "Member not found" });
        if (t.is_admin) return send(res, 400, { error: "Remove their admin role first" });
        Object.assign(t, { full_name: "Deleted member", email: null, phone_number: null, bio: null, account_status: "suspended", is_published: false });
        T.posts = T.posts.filter((x) => x.user_id !== t.id);
        const au = db.users[t.id];
        if (au) { au.email = `deleted-${t.id}@deleted.skilled9ja.invalid`; au.password = uid(); }
        T.data_requests.filter((r) => r.user_id === t.id && r.status === "open").forEach((r) => Object.assign(r, { status: "done", completed_at: now() }));
        audit("profile", t.id, { deleted: true });
        return send(res, 200, { ok: true });
      }
      case "resolve_data_request": {
        const r = T.data_requests.find((x) => Number(x.id) === Number(body.id));
        if (!r || !["done", "rejected"].includes(body.status)) return send(res, 400, { error: "Unknown outcome" });
        Object.assign(r, { status: body.status, completed_at: now(), completed_by: me.id, note: reason });
        audit("data_request", String(r.id), { outcome: body.status });
        return send(res, 200, { ok: true });
      }
      case "list_audit": {
        const data = [...T.admin_audit_log].reverse().slice(0, 200);
        const admins = T.profiles.filter((x) => data.some((r) => r.admin_id === x.id)).map(({ id, full_name }) => ({ id, full_name }));
        return send(res, 200, { data, admins });
      }
      default:
        return send(res, 400, { error: "Unknown action" });
    }
  }

  // ── storage ──
  if (p.startsWith("/storage/v1/object/")) return send(res, 200, { Key: p.replace("/storage/v1/object/", "") });

  // ── rpc ──
  if (p === "/rest/v1/rpc/complete_signup") {
    const u = userFrom(req);
    if (!u) return send(res, 401, { message: "not signed in" });
    const prof = db.tables.profiles.find((x) => x.id === u.id);
    if (prof && ["incomplete", "pending_payment", "pending_manual"].includes(prof.account_status)) {
      prof.account_status = "active";
      prof.signup_step = 6;
    }
    return send(res, 204);
  }
  if (p.startsWith("/rest/v1/rpc/")) return send(res, 404, { code: "PGRST202", message: "function not found" });

  // ── tables ──
  const m = p.match(/^\/rest\/v1\/([a-z_]+)$/);
  if (m) {
    const table = db.tables[m[1]];
    if (!table) return send(res, 404, { code: "42P01", message: "relation does not exist" });
    const params = [...url.searchParams.entries()];
    const wantsObject = (req.headers.accept || "").includes("vnd.pgrst.object");
    const prefer = req.headers.prefer || "";
    const u = userFrom(req);

    if (req.method === "GET" || req.method === "HEAD") {
      let rows = table.filter((r) => matches(r, params));
      const limit = Number(url.searchParams.get("limit") || 0);
      const offset = Number(url.searchParams.get("offset") || 0);
      const total = rows.length;
      if (offset) rows = rows.slice(offset);
      if (limit) rows = rows.slice(0, limit);
      const headers = prefer.includes("count=exact") ? { "Content-Range": `0-${Math.max(rows.length - 1, 0)}/${total}` } : {};
      if (req.method === "HEAD") return send(res, 200, undefined, headers);
      if (wantsObject) {
        if (rows.length !== 1) return send(res, 406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: `The result contains ${rows.length} rows` });
        return send(res, 200, rows[0], headers);
      }
      return send(res, 200, rows, headers);
    }
    if (req.method === "POST") {
      const items = (Array.isArray(body) ? body : [body]).map((r) => ({ id: r.id ?? uid(), created_at: now(), ...r }));
      if (m[1] === "orders" && items.some((r) => !u || r.user_id !== u.id)) return send(res, 403, { code: "42501", message: "new row violates row-level security policy" });
      if (m[1] === "content_reports") {
        if (!u) return send(res, 401, { message: "not signed in" });
        for (const r of items) { r.reporter_id = r.reporter_id || u.id; r.status = "open"; }
        if (items.some((r) => table.some((x) => x.status === "open" && x.reporter_id === r.reporter_id && x.target_type === r.target_type && x.target_id === r.target_id)))
          return send(res, 409, { code: "23505", message: "duplicate key value violates unique constraint" });
        items.forEach((r, i) => (r.id = table.length + i + 1));
      }
      if (m[1] === "data_requests") {
        if (!u) return send(res, 401, { message: "not signed in" });
        for (const r of items) { r.user_id = u.id; r.status = "open"; }
        if (items.some((r) => table.some((x) => x.status === "open" && x.user_id === r.user_id && x.kind === r.kind)))
          return send(res, 409, { code: "23505", message: "duplicate key value violates unique constraint" });
        items.forEach((r, i) => (r.id = table.length + i + 1));
      }
      if (m[1] === "withdrawal_requests") {
        if (items.some((r) => !u || r.user_id !== u.id || r.status !== "pending" || Number(r.amount) < 1000)) return send(res, 403, { code: "42501", message: "new row violates row-level security policy" });
        if (items.some((r) => table.some((x) => x.user_id === r.user_id && x.status === "pending"))) return send(res, 409, { code: "23505", message: "duplicate key" });
        items.forEach((r, i) => (r.id = table.length + i + 1));
      }
      if (m[1] === "job_applications" && items.some((r) => table.some((x) => x.job_id === r.job_id && x.applicant_id === r.applicant_id)))
        return send(res, 409, { code: "23505", message: "duplicate key value violates unique constraint" });
      table.push(...items);
      if (prefer.includes("return=representation")) return send(res, 201, wantsObject ? items[0] : items);
      return send(res, 201);
    }
    if (req.method === "PATCH") {
      const rows = table.filter((r) => matches(r, params));
      if (m[1] === "profiles" && rows.some((r) => !u || r.id !== u.id)) return send(res, 200, []);
      rows.forEach((r) => Object.assign(r, body));
      if (prefer.includes("return=representation")) return send(res, 200, wantsObject ? rows[0] : rows);
      return send(res, 204);
    }
    if (req.method === "DELETE") {
      const keep = table.filter((r) => !matches(r, params));
      db.tables[m[1]] = keep;
      return send(res, 204);
    }
  }
  send(res, 404, { message: `mock has no route for ${req.method} ${p}` });
});

addEmployer();
server.listen(PORT, () => console.log(`mock supabase on http://localhost:${PORT}`));
