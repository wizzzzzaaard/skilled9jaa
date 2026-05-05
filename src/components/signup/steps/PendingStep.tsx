"use client";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
export function PendingStep() {
  const router = useRouter();
  return (
    <div className="text-center py-6">
      <div className="w-16 h-16 rounded-full bg-yellow-50 flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-8 h-8 text-yellow-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-text-primary mb-2">
        Payment submitted
      </h2>
      <p className="text-text-secondary mb-6">
        We'll confirm your transfer within 24 hours and activate your account.
        We'll notify you by email.
      </p>
      <Button variant="outline" onClick={() => router.push("/signup/pending")}>
        Check status
      </Button>
    </div>
  );
}