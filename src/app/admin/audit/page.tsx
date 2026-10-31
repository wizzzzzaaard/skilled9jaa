"use client";

import { useEffect, useState } from "react";
import { callAdmin } from "@/lib/admin";
import { downloadCsv, toCsv } from "@/lib/csv";

interface Entry {
  id: number;
  created_at: string;
  action: string;
  target_type: string;
  target_id: string;
  detail: Record<string, unknown> | null;
  reason: string | null;
  admin_id: string;
}

const ACTIONS: Record<string, string> = {
  set_user_status: "Changed member status",
  let_in: "Let members in",
  mark_paid: "Marked as paid",
  set_job_status: "Changed job status",
};

function describe(e: Entry) {
  const d = e.detail ?? {};
  if (e.action === "set_user_status" || e.action === "set_job_status") {
    const what = e.action === "set_job_status" && d.title ? `"${String(d.title)}" ` : "";
    return `${what}${String(d.from ?? "?")} → ${String(d.to ?? "?")}`;
  }
  if (e.action === "let_in") return e.target_id;
  return e.target_type;
}

export default function AdminAuditPage() {
  const [rows, setRows] = useState<Entry[] | null>(null);
  const [admins, setAdmins] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    callAdmin<{ data: Entry[]; admins?: { id: string; full_name: string | null }[]; missing?: boolean }>("list_audit").then((res) => {
      if (!res.ok) {
        setError(res.error);
        setRows([]);
        return;
      }
      setMissing(!!res.data.missing);
      setRows(res.data.data ?? []);
      setAdmins(Object.fromEntries((res.data.admins ?? []).map((a) => [a.id, a.full_name || "Admin"])));
    });
  }, []);

  const shown = (rows ?? []).filter((r) => !filter || r.action === filter);

  function exportCsv() {
    downloadCsv(
      `skilled9ja-audit-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(
        shown.map((r) => ({ when: r.created_at, admin: admins[r.admin_id] ?? r.admin_id, action: ACTIONS[r.action] ?? r.action, target: `${r.target_type} ${r.target_id}`, change: describe(r), reason: r.reason ?? "" })),
        [
          { key: "when", label: "When" },
          { key: "admin", label: "Admin" },
          { key: "action", label: "Action" },
          { key: "target", label: "Target" },
          { key: "change", label: "Change" },
          { key: "reason", label: "Reason" },
        ],
      ),
    );
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Audit log</h1>
          <p className="text-sm text-text-secondary mt-1">Every change an admin makes to members, payments and jobs. Newest first, last 200.</p>
        </div>
        <div className="flex gap-2">
          <select aria-label="Action" value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white">
            <option value="">All actions</option>
            {Object.entries(ACTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button type="button" onClick={exportCsv} disabled={!shown.length} className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold disabled:opacity-50">Export CSV</button>
        </div>
      </div>

      {error && <p className="mt-4 text-sm font-semibold text-red-700" role="alert">{error}</p>}
      {missing && (
        <p className="mt-4 text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2" role="status">
          The audit log table hasn&apos;t been created yet, so changes aren&apos;t being recorded. It&apos;s added by the admin audit database update.
        </p>
      )}

      <ol className="mt-4 bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {rows === null ? (
          <li className="px-4 py-8 text-center text-sm text-text-secondary">Loading…</li>
        ) : shown.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-text-secondary">Nothing recorded yet.</li>
        ) : (
          shown.map((r) => (
            <li key={r.id} className="px-4 py-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <time dateTime={r.created_at} className="text-text-secondary w-36 shrink-0">
                {new Date(r.created_at).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
              </time>
              <div className="flex-1 min-w-[220px]">
                <p>
                  <span className="font-semibold">{admins[r.admin_id] ?? "Admin"}</span> · {ACTIONS[r.action] ?? r.action}
                </p>
                <p className="text-text-secondary">{describe(r)}{r.reason ? ` · "${r.reason}"` : ""}</p>
              </div>
            </li>
          ))
        )}
      </ol>
    </div>
  );
}
