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

function session(user) {
  const token = `mock.${b64({ sub: user.id, email: user.email, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;
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
      const pat = arg.replace(/[%*]/g, "").toLowerCase();
      if (!String(val ?? "").toLowerCase().includes(pat)) return false;
      continue;
    }
    if (op === "gte" && !(Number(val) >= Number(arg))) return false;
    if (op === "lte" && !(Number(val) <= Number(arg))) return false;
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
  if (p === "/__mock/state") return send(res, 200, { profiles: db.tables.profiles.filter((x) => x.id !== EMPLOYER_ID), employer: db.tables.profiles.find((x) => x.id === EMPLOYER_ID), user_skills: db.tables.user_skills, orders: db.tables.orders, user_payments: db.tables.user_payments, provider_service_options: db.tables.provider_service_options, job_applications: db.tables.job_applications });
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
