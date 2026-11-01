"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { callAdmin } from "@/lib/admin";

interface Admin { id: string; full_name: string | null; email: string | null; admin_role?: string | null }

const ROLE_TEXT: Record<string, string> = {
  owner: "Everything, including payments, refunds, withdrawals, settings, the admin team and data requests.",
  support: "Members, jobs, reports and moderation, ID checks and bookings. No money, settings or personal-data exports.",
};

export default function TeamPage() {
  const [admins, setAdmins] = useState<Admin[] | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [hasRoles, setHasRoles] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("support");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<Admin | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: u } = await supabase.auth.getUser();
    setMe(u.user?.id ?? null);
    let res = await supabase.from("profiles").select("id, full_name, email, admin_role").eq("is_admin", true).order("full_name");
    if (res.error) {
      setHasRoles(false);
      res = (await supabase.from("profiles").select("id, full_name, email").eq("is_admin", true).order("full_name")) as unknown as typeof res;
    }
    setAdmins((res.data ?? []) as Admin[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function setRoleFor(a: Admin, next: string | null) {
    setBusy(true);
    const res = await callAdmin("set_admin_role", { user_id: a.id, role: next, reason: next ? `Role set to ${next}` : "Removed from admin team" });
    setBusy(false);
    setRemoving(null);
    if (!res.ok) return setMsg({ ok: false, text: res.error });
    setMsg({ ok: true, text: next ? `${a.full_name} is now ${next === "owner" ? "an owner" : "support"}.` : `${a.full_name} is no longer an admin.` });
    load();
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return setMsg({ ok: false, text: "Enter their email address." });
    setBusy(true);
    const { data: found } = await createClient().from("profiles").select("id, full_name, email, is_admin").ilike("email", clean).maybeSingle();
    if (!found) {
      setBusy(false);
      return setMsg({ ok: false, text: "No member uses that email. Ask them to sign up first, then add them here." });
    }
    if (found.is_admin) {
      setBusy(false);
      return setMsg({ ok: false, text: `${found.full_name} is already an admin.` });
    }
    setBusy(false);
    await setRoleFor(found as Admin, role);
    setEmail("");
  }

  const owners = (admins ?? []).filter((a) => (a.admin_role ?? "owner") === "owner").length;

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold text-text-primary">Admin team</h1>
      <p className="text-sm text-text-secondary mt-1">Give each person only the access they need. Every change is in the audit log.</p>
      {!hasRoles && <p className="mt-4 text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2" role="status">Roles arrive with the trust &amp; safety database update. Until then every admin has full access.</p>}
      {msg && <p className={`mt-4 text-sm font-semibold ${msg.ok ? "text-green-800" : "text-red-700"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</p>}

      <dl className="mt-5 grid sm:grid-cols-2 gap-3">
        {Object.entries(ROLE_TEXT).map(([k, v]) => (
          <div key={k} className="bg-white rounded-xl border border-gray-100 p-4">
            <dt className="font-semibold capitalize">{k}</dt>
            <dd className="text-sm text-text-secondary mt-1">{v}</dd>
          </div>
        ))}
      </dl>

      <ul className="mt-5 bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {admins === null ? (
          <li className="p-4 text-sm text-text-secondary">Loading…</li>
        ) : (
          admins.map((a) => {
            const r = a.admin_role ?? "owner";
            const self = a.id === me;
            return (
              <li key={a.id} className="p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[180px]">
                  <p className="font-semibold">{a.full_name || "No name"} {self && <span className="text-xs text-text-secondary">(you)</span>}</p>
                  <p className="text-xs text-text-secondary">{a.email}</p>
                </div>
                {self || !hasRoles ? (
                  <span className="text-sm capitalize">{r}</span>
                ) : (
                  <>
                    <label className="sr-only" htmlFor={`role-${a.id}`}>Role for {a.full_name}</label>
                    <select id={`role-${a.id}`} value={r} disabled={busy || (r === "owner" && owners <= 1)} onChange={(e) => setRoleFor(a, e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white">
                      <option value="owner">Owner</option>
                      <option value="support">Support</option>
                    </select>
                    <button type="button" disabled={busy} onClick={() => setRemoving(a)} className="px-3 py-2 rounded-lg border border-red-200 text-red-800 text-sm font-semibold">Remove</button>
                  </>
                )}
                {removing?.id === a.id && (
                  <div className="w-full flex flex-wrap items-center gap-2 bg-gray-50 rounded-lg p-3">
                    <span className="text-sm font-semibold">Remove {a.full_name} from the admin team?</span>
                    <button type="button" onClick={() => setRoleFor(a, null)} className="px-3 py-1.5 rounded-lg bg-red-700 text-white text-sm font-semibold">Remove</button>
                    <button type="button" onClick={() => setRemoving(null)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold">Cancel</button>
                  </div>
                )}
              </li>
            );
          })
        )}
      </ul>

      <form onSubmit={add} className="mt-5 bg-white rounded-xl border border-gray-100 p-4">
        <h2 className="font-semibold">Add someone</h2>
        <p className="text-sm text-text-secondary">They need a Skilled9ja account already. Ask them to turn on two-step login straight away.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <label htmlFor="add-email" className="sr-only">Their email</label>
          <input id="add-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Their email" className="flex-1 min-w-[200px] rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <label htmlFor="add-role" className="sr-only">Role</label>
          <select id="add-role" value={role} onChange={(e) => setRole(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white">
            <option value="support">Support</option>
            <option value="owner">Owner</option>
          </select>
          <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50">Add to team</button>
        </div>
      </form>
    </div>
  );
}
