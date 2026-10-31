// admin-actions: every change an admin makes to someone else's data.
// Runs with the service role, so it checks the caller is an admin first and
// records each change in admin_audit_log (when that table exists).
// Deploy: supabase functions deploy admin-actions
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
const MAX_BULK = 500;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await supabase.auth.getUser(token);
  if (!auth?.user) return json({ error: "Unauthorized" }, 401);
  const { data: me } = await supabase.from("profiles").select("id, is_admin, full_name").eq("id", auth.user.id).maybeSingle();
  if (!me?.is_admin) return json({ error: "Forbidden" }, 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const action = String(body.action ?? "");
  const reason = typeof body.reason === "string" ? body.reason.slice(0, 300) : null;

  async function audit(target_type: string, target_id: string, detail: Record<string, unknown>) {
    // Ignore the error if the audit table hasn't been created yet.
    await supabase.from("admin_audit_log").insert({ admin_id: me!.id, action, target_type, target_id, detail, reason });
  }

  try {
    switch (action) {
      case "set_user_status": {
        const userId = String(body.user_id ?? "");
        const status = String(body.status ?? "");
        if (!USER_STATUSES.includes(status)) return json({ error: "Unknown status" }, 400);
        if (userId === me.id) return json({ error: "You can't change your own account here" }, 400);
        const { data: before } = await supabase.from("profiles").select("account_status").eq("id", userId).maybeSingle();
        if (!before) return json({ error: "Member not found" }, 404);
        const { error } = await supabase.from("profiles").update({ account_status: status, ...(status === "active" ? { signup_step: 6 } : {}) }).eq("id", userId);
        if (error) throw error;
        await audit("profile", userId, { from: before.account_status, to: status });
        return json({ ok: true });
      }

      case "let_in": {
        // Let stuck members (unfinished, waiting at payment or transfer check) into the app.
        const ids = (Array.isArray(body.user_ids) ? body.user_ids : []).map(String).slice(0, MAX_BULK);
        if (!ids.length) return json({ error: "No members chosen" }, 400);
        const { data, error } = await supabase
          .from("profiles")
          .update({ account_status: "active", signup_step: 6 })
          .in("id", ids)
          .in("account_status", ["incomplete", "pending_payment", "pending_manual"])
          .select("id");
        if (error) throw error;
        await audit("profiles", `${data?.length ?? 0} members`, { ids: (data ?? []).map((r: { id: string }) => r.id) });
        return json({ ok: true, updated: data?.length ?? 0 });
      }

      case "mark_paid": {
        const userId = String(body.user_id ?? "");
        const { error } = await supabase.from("profiles").update({ payment_status: "verified", is_published: true }).eq("id", userId);
        if (error) throw error;
        await supabase.from("user_payments").update({ status: "approved", approved_at: new Date().toISOString(), approved_by: me.id }).eq("user_id", userId).eq("status", "pending");
        await audit("profile", userId, { payment_status: "verified" });
        return json({ ok: true });
      }

      case "list_jobs": {
        const status = typeof body.status === "string" && body.status ? body.status : null;
        const q = typeof body.q === "string" ? body.q.slice(0, 60) : "";
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

      case "list_audit": {
        const { data, error } = await supabase
          .from("admin_audit_log")
          .select("id, created_at, action, target_type, target_id, detail, reason, admin_id")
          .order("created_at", { ascending: false })
          .limit(200);
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
