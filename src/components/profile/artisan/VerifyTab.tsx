"use client";
import { useState, useEffect, useRef } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CheckCircle, Clock, Upload } from "lucide-react";
import { useUIStore } from "@/store/uiStore";

const ID_TYPES = ["NIN", "Voters Card", "International Passport", "Driver's License"];

interface Verification {
  id: number;
  status: string;
  document_type: string | null;
  front_image_url: string | null;
  back_image_url: string | null;
  selfie_image_url: string | null;
  rejected_reason: string | null;
}

export function VerifyTab() {
  const { user } = useSessionStore();
  const { addToast } = useUIStore();
  const [verification, setVerification] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [frontUrl, setFrontUrl] = useState("");
  const [backUrl, setBackUrl] = useState("");
  const [selfieUrl, setSelfieUrl] = useState("");
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

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

  async function uploadImage(file: File, slot: "front" | "back" | "selfie") {
    if (!user) return;
    const supabase = createClient();
    const path = `verifications/${user.id}/${slot}.webp`;

    const compress = (f: File): Promise<Blob> =>
      new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(f);
        img.onload = () => {
          const MAX = 1000;
          let { width, height } = img;
          if (width > MAX) { height = (height * MAX) / width; width = MAX; }
          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
          canvas.toBlob((b) => resolve(b!), "image/webp", 0.85);
          URL.revokeObjectURL(url);
        };
        img.src = url;
      });

    const compressed = await compress(file);
    await supabase.storage.from("skilled-niger-assets").upload(path, compressed, { upsert: true, contentType: "image/webp" });
    const { data: { publicUrl } } = supabase.storage.from("skilled-niger-assets").getPublicUrl(path);
    if (slot === "front") setFrontUrl(publicUrl);
    if (slot === "back") setBackUrl(publicUrl);
    if (slot === "selfie") setSelfieUrl(publicUrl);
  }

  async function handleSubmit() {
    if (!user) return;
    if (!idType || !idNumber || !frontUrl || !backUrl || !selfieUrl) {
      addToast("Please complete all fields and upload all images", "error");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from("verifications").upsert({
      user_id: user.id,
      document_type: idType,
      status: "pending",
      front_image_url: frontUrl,
      back_image_url: backUrl,
      selfie_image_url: selfieUrl,
    }, { onConflict: "user_id" });

    if (error) {
      addToast("Submission failed", "error");
    } else {
      addToast("Submitted for review", "success");
      setVerification({ id: 0, status: "pending", document_type: idType, front_image_url: frontUrl, back_image_url: backUrl, selfie_image_url: selfieUrl, rejected_reason: null });
    }
    setSubmitting(false);
  }

  if (loading) return <div className="py-8 text-center text-text-secondary text-sm">Loading...</div>;

  if (verification?.status === "verified") {
    return (
      <div className="text-center py-10">
        <CheckCircle className="w-14 h-14 text-primary mx-auto mb-3" />
        <h3 className="font-bold text-text-primary text-lg">Identity Verified</h3>
        <p className="text-sm text-text-secondary mt-1">Your verified badge is live across the app.</p>
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

  function UploadSlot({ label, url, inputRef, slot }: { label: string; url: string; inputRef: React.RefObject<HTMLInputElement>; slot: "front" | "back" | "selfie" }) {
    return (
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">{label}</label>
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-xl h-28 flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden"
        >
          {url ? (
            <img src={url} alt={label} className="w-full h-full object-cover rounded-xl" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-text-secondary">
              <Upload className="w-5 h-5" />
              <span className="text-xs">Tap to upload</span>
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, slot); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-text-primary">Identity Verification</h3>
      <p className="text-sm text-text-secondary">Submit your ID documents to get a verified badge on your profile.</p>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">ID Type</label>
        <select
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={idType}
          onChange={(e) => setIdType(e.target.value)}
        >
          <option value="">Select ID type</option>
          {ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <Input
        label="ID Number"
        placeholder="Enter your ID number"
        value={idNumber}
        onChange={(e) => setIdNumber(e.target.value)}
      />

      <UploadSlot label="ID Front" url={frontUrl} inputRef={frontRef} slot="front" />
      <UploadSlot label="ID Back" url={backUrl} inputRef={backRef} slot="back" />
      <UploadSlot label="Selfie holding ID" url={selfieUrl} inputRef={selfieRef} slot="selfie" />

      <Button variant="primary" className="w-full" isLoading={submitting} onClick={handleSubmit}>
        Submit for Verification
      </Button>
    </div>
  );
}