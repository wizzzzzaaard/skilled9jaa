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

async function callAdminVerifications(action: string, body?: object) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-verifications`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ action, ...body }),
    }
  );
  return res.json();
}

export default function AdminVerificationsPage() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const res = await callAdminVerifications("fetch_all");
    if (res.data) setVerifications(res.data);
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
    }
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
    }
    setActionId(null);
  }

  const filtered = verifications.filter((v) => {
    if (tab === "pending") return v.status === "pending";
    if (tab === "approved") return v.status === "verified";
    return v.status === "rejected";
  });

  const pendingCount = verifications.filter((v) => v.status === "pending").length;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Verifications</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["pending", "approved", "rejected"] as const).map((t) => (
          <button
            key={t}
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
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img src={selectedImage} alt="Document" className="max-w-full max-h-full rounded-xl" />
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
            <div key={v.id} className="bg-white rounded-xl border border-gray-100 p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
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
                      <img
                        src={url}
                        alt={label}
                        className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity border border-gray-100"
                        onClick={() => setSelectedImage(url)}
                      />
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
                      <textarea
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