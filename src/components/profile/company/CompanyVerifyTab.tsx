"use client";
import { useState, useEffect, useRef } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CheckCircle, Clock, Upload } from "lucide-react";
import { useUIStore } from "@/store/uiStore";

const DOC_TYPES = ["CAC Certificate", "Business Registration", "Tax Identification Number (TIN)", "Other"];

interface Verification {
  id: number;
  status: string;
  document_type: string | null;
  front_image_url: string | null;
  rejected_reason: string | null;
}

export function CompanyVerifyTab() {
  const { user } = useSessionStore();
  const { addToast } = useUIStore();
  const [verification, setVerification] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [docType, setDocType] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase.from("verifications")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setVerification(data);
        setLoading(false);
      });
  }, [user?.id]);

  async function uploadDoc(file: File) {
    if (!user) return;
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `verifications/${user.id}/business-doc.${ext}`;
    await supabase.storage.from("skilled-niger-assets").upload(path, file, { upsert: true, contentType: file.type });
    const { data: { publicUrl } } = supabase.storage.from("skilled-niger-assets").getPublicUrl(path);
    setDocUrl(publicUrl);
    setUploading(false);
  }

  async function handleSubmit() {
    if (!user) return;
    if (!docType || !regNumber || !docUrl) {
      addToast("Please complete all fields and upload your document", "error");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from("verifications").upsert({
      user_id: user.id,
      document_type: docType,
      status: "pending",
      front_image_url: docUrl,
    }, { onConflict: "user_id" });

    if (error) {
      addToast("Submission failed", "error");
    } else {
      addToast("Submitted for review", "success");
      setVerification({ id: 0, status: "pending", document_type: docType, front_image_url: docUrl, rejected_reason: null });
    }
    setSubmitting(false);
  }

  if (loading) return <div className="py-8 text-center text-text-secondary text-sm">Loading...</div>;

  if (verification?.status === "verified") {
    return (
      <div className="text-center py-10">
        <CheckCircle className="w-14 h-14 text-primary mx-auto mb-3" />
        <h3 className="font-bold text-text-primary text-lg">Business Verified</h3>
        <p className="text-sm text-text-secondary mt-1">Your verified badge is live on your company profile.</p>
      </div>
    );
  }

  if (verification?.status === "pending") {
    return (
      <div className="text-center py-10">
        <Clock className="w-14 h-14 text-yellow-500 mx-auto mb-3" />
        <h3 className="font-bold text-text-primary text-lg">Under Review</h3>
        <p className="text-sm text-text-secondary mt-1">Our team is reviewing your documents. You'll be notified by email.</p>
      </div>
    );
  }

  if (verification?.status === "rejected") {
    return (
      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
        <p className="font-semibold">Rejected</p>
        <p>{verification.rejected_reason || "Please resubmit your documents."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-text-primary">Business Verification</h3>
      <p className="text-sm text-text-secondary">Submit your business registration documents to get verified.</p>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">Document Type</label>
        <select
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
        >
          <option value="">Select document type</option>
          {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <Input
        label="Registration Number"
        placeholder="e.g. RC123456"
        value={regNumber}
        onChange={(e) => setRegNumber(e.target.value)}
      />

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">Upload Document</label>
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-xl h-32 flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden"
        >
          {docUrl ? (
            <div className="text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-1" />
              <p className="text-xs text-green-600 font-medium">Document uploaded</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-text-secondary">
              <Upload className="w-5 h-5" />
              <span className="text-xs">{uploading ? "Uploading..." : "Tap to upload"}</span>
              <span className="text-xs text-gray-400">PDF, JPG, PNG accepted</span>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDoc(f); }}
        />
      </div>

      <Button variant="primary" className="w-full" isLoading={submitting} onClick={handleSubmit}>
        Submit for Verification
      </Button>
    </div>
  );
}