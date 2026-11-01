// admin-actions: every change an admin makes to someone else's data.
// Runs with the service role, so it checks the caller first:
//   1. signed in and is_admin;
//   2. two-step login: if the admin has an authenticator set up (or
//      REQUIRE_ADMIN_MFA=true), the session must have passed it (aal2);
//   3. role: "support" can't touch money, settings, roles or personal-data requests.
// Each change is written to admin_audit_log.
// Deploy: supabase functions deploy admin-actions
// Secrets: PAYSTACK_SECRET_KEY (refunds), REQUIRE_ADMIN_MFA (optional, "true").
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const USER_STATUSES = ["active", "suspended"];
const JOB_STATUSES = ["active", "closed", "removed"];
const STUCK = ["incomplete", "pending_payment", "pending_manual"];
const MAX_BULK = 500;
// Actions only an owner may run.
const OWNER_ONLY = new Set(["mark_paid", "refund", "process_withdrawal", "list_withdrawals", "list_data_requests", "export_member", "delete_member", "resolve_data_request", "set_admin_role"]);

function jwtClaims(token: string): Record<string, unknown> {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(part + "===".slice((part.length + 3) % 4)));
  } catch {
    return {};
  }
}
const clean = (s: unknown, max = 300) => (typeof s === "string" ? s.trim().slice(0, max) : "");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await supabase.auth.getUser(token);
  if (!auth?.user) return json({ error: "Unauthorized" }, 401);
  const { data: me } = await supabase.from("profiles").select("id, is_admin, full_name, admin_role").eq("id", auth.user.id).maybeSingle();
  if (!me?.is_admin) return json({ error: "Forbidden" }, 403);

  // Two-step login.
  const hasFactor = (auth.user.factors ?? []).some((f: { status: string }) => f.status === "verified");
  const aal = jwtClaims(token).aal;
  if ((hasFactor || Deno.env.get("REQUIRE_ADMIN_MFA") === "true") && aal !== "aal2") {
    return json({ error: "Confirm your sign-in with your authenticator app first.", needsMfa: true }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const action = String(body.action ?? "");
  const role = me.admin_role ?? "owner"; // before the roles update, every admin is an owner
  if (OWNER_ONLY.has(action) && role !== "owner") return json({ error: "Only an owner admin can do this." }, 403);
  const reason = clean(body.reason) || null;

  async function audit(target_type: string, target_id: string, detail: Record<string, unknown>) {
    // Ignore the error if the audit table hasn't been created yet.
    await supabase.from("admin_audit_log").insert({ admin_id: me!.id, action, target_type, target_id, detail, reason });
  }

  try {
    switch (action) {
      case "whoami":
        return json({ role, mfa: hasFactor, aal });

      // ── members ──
      case "set_user_status": {
        const userId = String(body.user_id ?? "");
        const status = String(body.status ?? "");
        if (!USER_STATUSES.includes(status)) return json({ error: "Unknown status" }, 400);
        if (userId === me.id) return json({ error: "You can't change your own account here" }, 400);
        const { data: before } = await supabase.from("profiles").select("account_status, is_admin").eq("id", userId).maybeSingle();
        if (!before) return json({ error: "Member not found" }, 404);
        if (before.is_admin && role !== "owner") return json({ error: "Only an owner can suspend another admin." }, 403);
        const { error } = await supabase.from("profiles").update({ account_status: status, ...(status === "active" ? { signup_step: 6 } : {}) }).eq("id", userId);
        if (error) throw error;
        await audit("profile", userId, { from: before.account_status, to: status });
        return json({ ok: true });
      }

      case "let_in": {
        const ids = (Array.isArray(body.user_ids) ? body.user_ids : []).map(String).slice(0, MAX_BULK);
        if (!ids.length) return json({ error: "No members chosen" }, 400);
        const { data, error } = await supabase.from("profiles").update({ account_status: "active", signup_step: 6 }).in("id", ids).in("account_status", STUCK).select("id");
        if (error) throw error;
        await audit("profiles", `${data?.length ?? 0} members`, { ids: (data ?? []).map((r: { id: string }) => r.id) });
        return json({ ok: true, updated: data?.length ?? 0 });
      }

      case "add_note": {
        const userId = String(body.user_id ?? "");
        const text = clean(body.body, 2000);
        if (!text) return json({ error: "Write a note first" }, 400);
        const { data, error } = await supabase.from("admin_notes").insert({ member_id: userId, admin_id: me.id, body: text }).select("id, created_at, body, admin_id").single();
        if (error) throw error;
        return json({ ok: true, note: { ...data, admin_name: me.full_name } });
      }

      case "list_notes": {
        const { data, error } = await supabase.from("admin_notes").select("id, created_at, body, admin_id").eq("member_id", String(body.user_id ?? "")).order("created_at", { ascending: false }).limit(100);
        if (error) return json({ data: [], missing: true });
        const ids = Array.from(new Set((data ?? []).map((n: { admin_id: string }) => n.admin_id)));
        const { data: admins } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
        const names = Object.fromEntries((admins ?? []).map((a: { id: string; full_name: string }) => [a.id, a.full_name]));
        return json({ data: (data ?? []).map((n: { admin_id: string }) => ({ ...n, admin_name: names[n.admin_id] ?? "Admin" })) });
      }

      case "set_admin_role": {
        const userId = String(body.user_id ?? "");
        const next = body.role === null ? null : String(body.role ?? "");
        if (next !== null && !["owner", "support"].includes(next)) return json({ error: "Unknown role" }, 400);
        if (userId === me.id) return json({ error: "You can't change your own admin role" }, 400);
        const { data: before } = await supabase.from("profiles").select("is_admin, admin_role").eq("id", userId).maybeSingle();
        if (!before) return json({ error: "Member not found" }, 404);
        const { error } = await supabase.from("profiles").update(next ? { is_admin: true, admin_role: next } : { is_admin: false, admin_role: null }).eq("id", userId);
        if (error) throw error;
        await audit("profile", userId, { from: before.is_admin ? before.admin_role ?? "owner" : "member", to: next ?? "member" });
        return json({ ok: true });
      }

      // ── money (owner only) ──
      case "mark_paid": {
        const userId = String(body.user_id ?? "");
        const { error } = await supabase.from("profiles").update({ payment_status: "verified", is_published: true }).eq("id", userId);
        if (error) throw error;
        await supabase.from("user_payments").update({ status: "approved", approved_at: new Date().toISOString(), approved_by: me.id }).eq("user_id", userId).eq("status", "pending");
        await audit("profile", userId, { payment_status: "verified" });
        return json({ ok: true });
      }

      case "refund": {
        // kind "card": an orders row paid through Paystack, refunded through Paystack.
        // kind "transfer": a user_payments row; you send the money back yourself, this records it.
        const kind = body.kind === "card" ? "card" : body.kind === "transfer" ? "transfer" : null;
        const id = String(body.id ?? "");
        if (!kind || !id) return json({ error: "Choose a payment to refund" }, 400);
        if (!reason) return json({ error: "A reason is required for refunds" }, 400);
        const table = kind === "card" ? "orders" : "user_payments";
        const { data: pay } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
        if (!pay) return json({ error: "Payment not found" }, 404);
        if (pay.status === "refunded") return json({ error: "Already refunded" }, 400);
        if (!["verified", "approved"].includes(pay.status)) return json({ error: "Only completed payments can be refunded" }, 400);
        const amount = Math.min(Number(body.amount ?? pay.amount) || Number(pay.amount), Number(pay.amount));
        if (!(amount > 0)) return json({ error: "Enter an amount" }, 400);

        if (kind === "card") {
          const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
          const ref = pay.payment_reference ?? pay.transaction_ref;
          if (!secret) return json({ error: "Paystack isn't connected to this function yet (PAYSTACK_SECRET_KEY)." }, 400);
          if (!ref) return json({ error: "This order has no Paystack reference" }, 400);
          const res = await fetch("https://api.paystack.co/refund", {
            method: "POST",
            headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
            body: JSON.stringify({ transaction: ref, amount: Math.round(amount * 100), merchant_note: reason }),
          });
          const out = await res.json().catch(() => ({}));
          if (!res.ok || out.status === false) return json({ error: `Paystack said: ${out.message ?? res.status}` }, 400);
        }
        const { error } = await supabase.from(table).update({ status: "refunded", refunded_at: new Date().toISOString(), refund_amount: amount }).eq("id", id);
        if (error) throw error;
        if (body.revoke === true) {
          await supabase.from("profiles").update({ payment_status: "unpaid", is_published: false }).eq("id", pay.user_id);
        }
        await audit(kind === "card" ? "order" : "transfer", id, { user_id: pay.user_id, amount, revoked: body.revoke === true });
        return json({ ok: true });
      }

      case "list_withdrawals": {
        const { data, error } = await supabase.from("withdrawal_requests").select("*").order("created_at", { ascending: false }).limit(200);
        if (error) throw error;
        const ids = Array.from(new Set((data ?? []).map((w: { user_id: string }) => w.user_id)));
        const { data: people } = ids.length ? await supabase.from("profiles").select("id, full_name, email, phone_number").in("id", ids) : { data: [] };
        const { data: wallets } = ids.length ? await supabase.from("wallets").select("user_id, balance").in("user_id", ids) : { data: [] };
        return json({ data, people: people ?? [], wallets: wallets ?? [] });
      }

      case "process_withdrawal": {
        const id = Number(body.id);
        const decision = String(body.decision ?? "");
        if (!["paid", "rejected"].includes(decision)) return json({ error: "Approve or reject" }, 400);
        const { data: w } = await supabase.from("withdrawal_requests").select("*").eq("id", id).maybeSingle();
        if (!w) return json({ error: "Request not found" }, 404);
        if (w.status !== "pending") return json({ error: "Already processed" }, 400);
        if (decision === "rejected") {
          if (!reason) return json({ error: "Give the member a reason" }, 400);
          await supabase.from("withdrawal_requests").update({ status: "rejected", rejection_reason: reason, processed_at: new Date().toISOString(), processed_by: me.id }).eq("id", id);
        } else {
          const { data: settings } = await supabase.from("platform_settings").select("withdrawal_fee_pct").eq("id", 1).maybeSingle();
          const fee = Math.round(Number(w.amount) * Number(settings?.withdrawal_fee_pct ?? 0)) / 100;
          const { data: wallet } = await supabase.from("wallets").select("balance, total_withdrawn").eq("user_id", w.user_id).maybeSingle();
          if (!wallet || Number(wallet.balance) < Number(w.amount)) return json({ error: "Their wallet balance is lower than this request" }, 400);
          await supabase.from("wallets").update({ balance: Number(wallet.balance) - Number(w.amount), total_withdrawn: Number(wallet.total_withdrawn ?? 0) + Number(w.amount) }).eq("user_id", w.user_id);
          await supabase.from("withdrawal_requests").update({ status: "paid", fee_charged: fee, net_amount: Number(w.amount) - fee, processed_at: new Date().toISOString(), processed_by: me.id }).eq("id", id);
          await supabase.from("wallet_transactions").insert({ user_id: w.user_id, type: "debit", amount: w.amount, status: "completed", description: "Withdrawal", reference: `WD-${id}` });
        }
        await audit("withdrawal", String(id), { decision, amount: w.amount, user_id: w.user_id });
        return json({ ok: true });
      }

      // ── jobs ──
      case "list_jobs": {
        const status = typeof body.status === "string" && body.status ? body.status : null;
        const q = clean(body.q, 60);
        let query = supabase
          .from("jobs")
          .select("id, title, state, city, status, job_type, salary_min, salary_max, applications_count, created_at, employer_id", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(Number(body.offset ?? 0), Number(body.offset ?? 0) + 49);
        if (status) query = query.eq("status", status);
        if (q) query = query.ilike("title", `%${q.replace(/[%_,()]/g, " ")}%`);
        const { data, count, error } = await query;
        if (error) throw error;
        const ids = Array.from(new Set((data ?? []).map((j: { employer_id: string }) => j.employer_id)));
        const { data: emps } = ids.length ? await supabase.from("profiles").select("id, company_name, full_name, email").in("id", ids) : { data: [] };
        return json({ data, count, employers: emps ?? [] });
      }

      case "set_job_status": {
        const jobId = String(body.job_id ?? "");
        const status = String(body.status ?? "");
        if (!JOB_STATUSES.includes(status)) return json({ error: "Unknown status" }, 400);
        const { data: before } = await supabase.from("jobs").select("status, title").eq("id", jobId).maybeSingle();
        if (!before) return json({ error: "Job not found" }, 404);
        const { error } = await supabase.from("jobs").update({ status }).eq("id", jobId);
        if (error) throw error;
        await audit("job", jobId, { title: before.title, from: before.status, to: status });
        return json({ ok: true });
      }

      // ── moderation ──
      case "list_reports": {
        const status = ["open", "actioned", "dismissed"].includes(String(body.status)) ? String(body.status) : "open";
        const { data, error } = await supabase.from("content_reports").select("*").eq("status", status).order("created_at", { ascending: false }).limit(200);
        if (error) return json({ data: [], missing: true });
        const rows = data ?? [];
        const pick = (t: string) => rows.filter((r: { target_type: string }) => r.target_type === t).map((r: { target_id: string }) => r.target_id);
        const people = Array.from(new Set([...rows.map((r: { reporter_id: string }) => r.reporter_id), ...pick("profile")]));
        const [p, j, po] = await Promise.all([
          people.length ? supabase.from("profiles").select("id, full_name, company_name, email, account_status, slug, company_slug").in("id", people) : { data: [] },
          pick("job").length ? supabase.from("jobs").select("id, title, status, employer_id").in("id", pick("job")) : { data: [] },
          pick("post").length ? supabase.from("posts").select("id, caption, user_id, hidden_at").in("id", pick("post").map(Number).filter(Boolean)) : { data: [] },
        ]);
        const reviews = pick("review").length ? (await supabase.from("bookings").select("id, client_review, client_rating, review_hidden, client_id, provider_id").in("id", pick("review"))).data : [];
        return json({ data: rows, profiles: p.data ?? [], jobs: j.data ?? [], posts: po.data ?? [], reviews: reviews ?? [] });
      }

      case "resolve_report": {
        const id = Number(body.id);
        const status = String(body.status ?? "");
        if (!["actioned", "dismissed"].includes(status)) return json({ error: "Unknown outcome" }, 400);
        const { data: r } = await supabase.from("content_reports").select("target_type, target_id, status").eq("id", id).maybeSingle();
        if (!r) return json({ error: "Report not found" }, 404);
        // Close every open report about the same thing, so duplicates don't linger.
        const { data: closed, error } = await supabase
          .from("content_reports")
          .update({ status, resolved_at: new Date().toISOString(), resolved_by: me.id, resolution: reason })
          .eq("target_type", r.target_type)
          .eq("target_id", r.target_id)
          .eq("status", "open")
          .select("id");
        if (error) throw error;
        await audit("report", String(id), { target: `${r.target_type} ${r.target_id}`, outcome: status, closed: closed?.length ?? 0 });
        return json({ ok: true, closed: closed?.length ?? 0 });
      }

      case "list_posts": {
        const hidden = body.hidden === true;
        let q = supabase.from("posts").select("id, caption, post_type, created_at, user_id, hidden_at, hidden_reason").order("created_at", { ascending: false }).limit(100);
        q = hidden ? q.not("hidden_at", "is", null) : q.is("hidden_at", null);
        const { data, error } = await q;
        if (error) return json({ data: [], missing: true });
        const ids = Array.from(new Set((data ?? []).map((x: { user_id: string }) => x.user_id)));
        const { data: people } = ids.length ? await supabase.from("profiles").select("id, full_name, company_name, slug, company_slug").in("id", ids) : { data: [] };
        return json({ data, people: people ?? [] });
      }

      case "set_post_hidden": {
        const id = Number(body.id);
        const hide = body.hidden === true;
        if (hide && !reason) return json({ error: "A reason is required to hide a post" }, 400);
        const { error } = await supabase.from("posts").update(hide ? { hidden_at: new Date().toISOString(), hidden_reason: reason } : { hidden_at: null, hidden_reason: null }).eq("id", id);
        if (error) throw error;
        await audit("post", String(id), { hidden: hide });
        return json({ ok: true });
      }

      case "list_reviews": {
        const { data, error } = await supabase.from("bookings").select("id, client_review, client_rating, rated_at, review_hidden, client_id, provider_id").not("client_review", "is", null).order("rated_at", { ascending: false }).limit(100);
        if (error) return json({ data: [], missing: true });
        const ids = Array.from(new Set((data ?? []).flatMap((b: { client_id: string; provider_id: string }) => [b.client_id, b.provider_id])));
        const { data: people } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
        return json({ data, people: people ?? [] });
      }

      case "set_review_hidden": {
        const id = String(body.id ?? "");
        const hide = body.hidden === true;
        if (hide && !reason) return json({ error: "A reason is required to hide a review" }, 400);
        const { error } = await supabase.from("bookings").update({ review_hidden: hide }).eq("id", id);
        if (error) throw error;
        await audit("review", id, { hidden: hide });
        return json({ ok: true });
      }

      // ── personal-data requests (owner only) ──
      case "list_data_requests": {
        const { data, error } = await supabase.from("data_requests").select("*").order("created_at", { ascending: false }).limit(200);
        if (error) return json({ data: [], missing: true });
        const ids = Array.from(new Set((data ?? []).map((r: { user_id: string }) => r.user_id)));
        const { data: people } = ids.length ? await supabase.from("profiles").select("id, full_name, email, phone_number").in("id", ids) : { data: [] };
        return json({ data, people: people ?? [] });
      }

      case "export_member": {
        const userId = String(body.user_id ?? "");
        const take = async (table: string, col: string, cols = "*") => {
          const { data } = await supabase.from(table).select(cols).eq(col, userId);
          return data ?? [];
        };
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
        if (!profile) return json({ error: "Member not found" }, 404);
        const out = {
          exported_at: new Date().toISOString(),
          note: "Your personal data held by Skilled9ja. Identity documents are listed but not included; ask us for copies.",
          profile,
          skills: await take("user_skills", "user_id"),
          posts: await take("posts", "user_id"),
          jobs_posted: await take("jobs", "employer_id"),
          job_applications: await take("job_applications", "applicant_id"),
          card_payments: await take("orders", "user_id"),
          bank_transfers: await take("user_payments", "user_id"),
          bookings_as_client: await take("bookings", "client_id"),
          bookings_as_provider: await take("bookings", "provider_id"),
          wallet: await take("wallets", "user_id"),
          wallet_transactions: await take("wallet_transactions", "user_id"),
          withdrawals: await take("withdrawal_requests", "user_id"),
          identity_checks: await take("verifications", "user_id", "id, document_type, status, created_at, reviewed_at"),
          reports_made: await take("content_reports", "reporter_id"),
        };
        await audit("profile", userId, { exported: true });
        return json({ ok: true, data: out });
      }

      case "delete_member": {
        // Erases personal details and closes the login. Payment records stay
        // (with the name removed) because tax law requires keeping them.
        const userId = String(body.user_id ?? "");
        if (userId === me.id) return json({ error: "You can't delete your own account here" }, 400);
        if (String(body.confirm ?? "") !== "DELETE") return json({ error: "Type DELETE to confirm" }, 400);
        const { data: target } = await supabase.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
        if (!target) return json({ error: "Member not found" }, 404);
        if (target.is_admin) return json({ error: "Remove their admin role first" }, 400);
        const blank = {
          full_name: "Deleted member", email: null, phone_number: null, additional_phone_number: null, bio: null, provider_bio: null,
          profile_image_url: null, whatsapp_url: null, telegram_url: null, linkedin_url: null, instagram_url: null, twitter: null,
          landmarks: null, latitude: null, longitude: null, nin_number: null, company_name: null, company_description: null,
          company_website: null, company_logo_url: null, hr_contact_name: null, hr_contact_phone: null, hr_contact_email: null,
          slug: null, company_slug: null, is_published: false, account_status: "suspended",
        };
        const { error } = await supabase.from("profiles").update(blank).eq("id", userId);
        if (error) throw error;
        await supabase.from("posts").delete().eq("user_id", userId);
        await supabase.from("user_skills").delete().eq("user_id", userId);
        await supabase.from("job_applications").delete().eq("applicant_id", userId);
        await supabase.from("verifications").delete().eq("user_id", userId);
        await supabase.from("jobs").update({ status: "removed" }).eq("employer_id", userId);
        await supabase.auth.admin.updateUserById(userId, {
          email: `deleted-${userId}@deleted.skilled9ja.invalid`,
          password: crypto.randomUUID() + crypto.randomUUID(),
          user_metadata: {},
          ban_duration: "876000h",
        });
        await supabase.from("data_requests").update({ status: "done", completed_at: new Date().toISOString(), completed_by: me.id }).eq("user_id", userId).eq("status", "open");
        await audit("profile", userId, { deleted: true });
        return json({ ok: true });
      }

      case "resolve_data_request": {
        const id = Number(body.id);
        const status = String(body.status ?? "");
        if (!["done", "rejected"].includes(status)) return json({ error: "Unknown outcome" }, 400);
        const { error } = await supabase.from("data_requests").update({ status, completed_at: new Date().toISOString(), completed_by: me.id, note: reason }).eq("id", id);
        if (error) throw error;
        await audit("data_request", String(id), { outcome: status });
        return json({ ok: true });
      }

      case "list_audit": {
        const { data, error } = await supabase.from("admin_audit_log").select("id, created_at, action, target_type, target_id, detail, reason, admin_id").order("created_at", { ascending: false }).limit(200);
        if (error) return json({ data: [], missing: true });
        const ids = Array.from(new Set((data ?? []).map((r: { admin_id: string }) => r.admin_id)));
        const { data: admins } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
        return json({ data, admins: admins ?? [] });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (err) {
    console.error("admin-actions", action, err);
    return json({ error: "Something went wrong. Nothing else was changed." }, 500);
  }
});
