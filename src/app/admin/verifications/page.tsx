"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface Verification {
  id: number;
  user_id: string;
  document_type: string | null;
  status: string;
  front_image_url: string | null;
  back_image_url: string | null;
  selfie_image_url: string | null;
  rejected_reason: string | null;
  created_at: string;
  profiles: { full_name: string; email: string } | null;
}

const REJECT_REASONS = [
  "The photo is blurry. Please take a clearer one in good light.",
  "The name on the ID doesn't match your profile name.",
  "Your face isn't clearly visible in the selfie.",
  "This ID has expired.",
  "Part of the ID is cut off. Show all four corners.",
];

async function callAdminVerifications(action: string, body?: object): Promise<{ data?: Verification[]; success?: boolean; error?: string }> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-verifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      },
      body: JSON.stringify({ action, ...body }),
    });
    const json = await res.json().catch(() => ({}));
    return res.ok ? json : { error: json.error ?? `Request failed (${res.status})` };
  } catch {
    return { error: "Can't reach the server. Check your connection." };
  }
}

export default function AdminVerificationsPage() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedImage) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelectedImage(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedImage]);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const res = await callAdminVerifications("fetch_all");
    if (res.data) setVerifications(res.data);
    else setError(res.error ?? "Couldn't load ID checks.");
    setLoading(false);
  }

  async function approve(v: Verification) {
    setActionId(v.id);
    const res = await callAdminVerifications("approve", {
      verification_id: v.id,
      user_id: v.user_id,
    });
    if (res.success) {
      setVerifications((prev) =>
        prev.map((x) => x.id === v.id ? { ...x, status: "verified" } : x)
      );
    } else setError(res.error ?? "Couldn't approve. Try again.");
    setActionId(null);
  }

  async function reject(v: Verification) {
    if (!rejectReason.trim()) return;
    setActionId(v.id);
    const res = await callAdminVerifications("reject", {
      verification_id: v.id,
      user_id: v.user_id,
      reason: rejectReason,
    });
    if (res.success) {
      setVerifications((prev) =>
        prev.map((x) => x.id === v.id ? { ...x, status: "rejected", rejected_reason: rejectReason } : x)
      );
      setRejectingId(null);
      setRejectReason("");
    } else setError(res.error ?? "Couldn't reject. Try again.");
    setActionId(null);
  }

  const filtered = verifications.filter((v) => {
    if (tab === "pending") return v.status === "pending";
    if (tab === "approved") return v.status === "verified";
    return v.status === "rejected";
  });

  const pendingCount = verifications.filter((v) => v.status === "pending").length;

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-2xl font-semibold text-text-primary">ID checks</h1>
      <p className="text-sm text-text-secondary mt-1 mb-4">Check the name matches the profile, the photo matches the selfie, and the ID hasn&apos;t expired. Members see the reason if you reject.</p>
      {error && <p className="mb-4 text-sm font-semibold text-red-700" role="alert">{error}</p>}

      {/* Tabs */}
      <div role="tablist" aria-label="ID check status" className="flex gap-2 mb-6 overflow-x-auto">
        {(["pending", "approved", "rejected"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t ? "bg-primary text-white" : "bg-white border border-gray-200 text-text-secondary"
            }`}
          >
            {t}
            {t === "pending" && pendingCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Image lightbox */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Document photo" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="Document, enlarged" className="max-w-full max-h-[85vh] rounded-xl" />
          <button type="button" autoFocus onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 px-4 py-2 rounded-lg bg-white text-sm font-semibold">Close</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-text-secondary bg-white rounded-xl border border-gray-100">
          No {tab} verifications
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((v) => (
            <div key={v.id} className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
                <div>
                  <p className="font-semibold text-text-primary">{v.profiles?.full_name || "Unknown"}</p>
                  <p className="text-sm text-text-secondary">{v.profiles?.email}</p>
                  {v.document_type && (
                    <p className="text-xs text-text-secondary mt-0.5">ID Type: {v.document_type}</p>
                  )}
                </div>
                <Badge variant={v.status === "verified" ? "success" : v.status === "rejected" ? "error" : "warning"}>
                  {v.status === "verified" ? "Verified" : v.status}
                </Badge>
              </div>

              {/* Document images */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { url: v.front_image_url, label: "ID Front" },
                  { url: v.back_image_url, label: "ID Back" },
                  { url: v.selfie_image_url, label: "Selfie with ID" },
                ].map(({ url, label }) => (
                  <div key={label}>
                    <p className="text-xs text-text-secondary mb-1">{label}</p>
                    {url ? (
                      <button type="button" onClick={() => setSelectedImage(url)} className="block w-full" aria-label={`Enlarge ${label}`}>
                        <img src={url} alt={label} className="w-full h-24 sm:h-32 object-cover rounded-lg hover:opacity-90 transition-opacity border border-gray-100" />
                      </button>
                    ) : (
                      <div className="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400">
                        Not uploaded
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Rejection reason if rejected */}
              {v.status === "rejected" && v.rejected_reason && (
                <div className="mb-4 p-3 bg-red-50 rounded-lg text-sm text-red-700">
                  <span className="font-semibold">Reason: </span>{v.rejected_reason}
                </div>
              )}

              {/* Actions */}
              {v.status === "pending" && (
                <div className="space-y-3">
                  {rejectingId === v.id ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {REJECT_REASONS.map((r) => (
                          <button key={r} type="button" onClick={() => setRejectReason(r)} className={`text-xs px-2 py-1 rounded-md border ${rejectReason === r ? "border-primary bg-primary/5" : "border-gray-200"}`}>{r.split(".")[0]}</button>
                        ))}
                      </div>
                      <label htmlFor={`rej-${v.id}`} className="sr-only">Reason for rejection</label>
                      <textarea
                        id={`rej-${v.id}`}
                        rows={2}
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="Reason for rejection..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setRejectingId(null); setRejectReason(""); }}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={actionId === v.id}
                          onClick={() => reject(v)}
                        >
                          Confirm Reject
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        isLoading={actionId === v.id}
                        onClick={() => approve(v)}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRejectingId(v.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}