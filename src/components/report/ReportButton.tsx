"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Flag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSessionStore } from "@/store/sessionStore";

type Target = "job" | "profile" | "post" | "review";
const REASONS: { v: string; label: string; hint: string }[] = [
  { v: "scam", label: "Scam or asks for money", hint: "e.g. asks for a fee to get the job, or payment outside Skilled9ja" },
  { v: "fake", label: "Fake or impersonating someone", hint: "Fake company, stolen photos, false details" },
  { v: "abuse", label: "Abusive, threatening or sexual", hint: "Harassment, hate, threats, sexual content" },
  { v: "spam", label: "Spam or repeated posts", hint: "The same thing posted again and again" },
  { v: "other", label: "Something else", hint: "Tell us below" },
];
const NOUN: Record<Target, string> = { job: "job", profile: "profile", post: "post", review: "review" };

/** "Report" link that opens a short form. Reports go to the admin's moderation queue. */
export function ReportButton({ targetType, targetId, className = "" }: { targetType: Target; targetId: string | number; className?: string }) {
  const user = useSessionStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    dialog.current?.querySelector<HTMLElement>("input, a, button")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    opener.current?.focus();
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;
    if (reason === "other" && details.trim().length < 5) {
      setState("error");
      setError("Tell us a little about the problem.");
      return;
    }
    setState("sending");
    const { error: err } = await createClient()
      .from("content_reports")
      .insert({ target_type: targetType, target_id: String(targetId), reason, details: details.trim().slice(0, 1000) || null });
    if (!err || err.code === "23505") return setState("sent"); // 23505: already reported, that's fine
    setState("error");
    setError(/Too many reports/.test(err.message) ? "You've sent a lot of reports today. Try again tomorrow." : "Couldn't send your report. Try again, or message us on WhatsApp.");
  }

  return (
    <>
      <button ref={opener} type="button" onClick={() => { setOpen(true); setState("idle"); }} className={`inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-red-700 underline-offset-2 hover:underline ${className}`}>
        <Flag className="w-4 h-4" aria-hidden="true" /> Report {NOUN[targetType]}
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="report-title">
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={close} />
          <div ref={dialog} className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
            <h2 id="report-title" className="text-lg font-semibold text-text-primary">Report this {NOUN[targetType]}</h2>
            {!user ? (
              <>
                <p className="text-sm text-text-secondary mt-2">Log in to send a report, so we can follow up if we need more details.</p>
                <div className="mt-4 flex gap-2">
                  <Link href={`/login?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold">Log in</Link>
                  <button type="button" onClick={close} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold">Cancel</button>
                </div>
              </>
            ) : state === "sent" ? (
              <>
                <p className="text-sm mt-2" role="status">Thanks. Our team will look at it, usually within a day. You won&apos;t be named to the person you reported.</p>
                <p className="text-sm text-text-secondary mt-2">Never pay anyone to get a job or to be &quot;shortlisted&quot;.</p>
                <button type="button" onClick={close} className="mt-4 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold">Done</button>
              </>
            ) : (
              <form onSubmit={send}>
                <fieldset className="mt-3">
                  <legend className="text-sm font-semibold">What&apos;s wrong?</legend>
                  <div className="mt-2 space-y-2">
                    {REASONS.map((r) => (
                      <label key={r.v} className={`flex gap-3 items-start rounded-lg border p-3 cursor-pointer ${reason === r.v ? "border-primary bg-primary/5" : "border-gray-200"}`}>
                        <input type="radio" name="report-reason" value={r.v} checked={reason === r.v} onChange={() => setReason(r.v)} className="mt-1 accent-[#1B4332]" />
                        <span className="text-sm"><span className="font-semibold block">{r.label}</span><span className="text-text-secondary">{r.hint}</span></span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label htmlFor="report-details" className="block text-sm font-semibold mt-3">Details {reason !== "other" && <span className="font-normal text-text-secondary">(optional)</span>}</label>
                <textarea id="report-details" rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                {state === "error" && <p className="mt-2 text-sm font-semibold text-red-700" role="alert">{error}</p>}
                <div className="mt-4 flex gap-2">
                  <button type="submit" disabled={!reason || state === "sending"} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50">{state === "sending" ? "Sending…" : "Send report"}</button>
                  <button type="button" onClick={close} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold">Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
