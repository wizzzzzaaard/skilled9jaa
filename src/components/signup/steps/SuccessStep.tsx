"use client";

import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";

export function SuccessStep() {
  const router = useRouter();

  return (
    <div className="text-center py-6">
      <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-8 h-8 text-success"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-text-primary mb-2">
        You're all set!
      </h2>
      <p className="text-text-secondary mb-6">
        Your account is active. Welcome to Skilled9ja!
      </p>
      <Button variant="primary" onClick={() => router.push("/dashboard")}>
        Go to Dashboard
      </Button>
    </div>
  );
}