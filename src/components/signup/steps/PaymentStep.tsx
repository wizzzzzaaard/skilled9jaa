"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { BankDetails } from "@/types/signup";

interface Props {
  isHomeService: boolean;
  amount: number;
  displayPrice: number;
  slashPrice: number;
  paymentMethod: "paystack" | "manual";
  setPaymentMethod: (v: "paystack" | "manual") => void;
  bankDetails: BankDetails | null;
  userId: string | null;
  isLoading: boolean;
  handleManualSubmit: () => void;
  handlePaystackPay: () => void;
  setStep: (s: any) => void;
  isArtisan: boolean;
}

export function PaymentStep({
  isHomeService,
  amount,
  displayPrice,
  slashPrice,
  paymentMethod,
  setPaymentMethod,
  bankDetails,
  userId,
  isLoading,
  handleManualSubmit,
  handlePaystackPay,
  setStep,
  isArtisan,
}: Props) {
  const [showUpsell, setShowUpsell] = useState(!isHomeService);
  const [upsellAccepted, setUpsellAccepted] = useState(false);

  const finalAmount = !isHomeService && upsellAccepted ? slashPrice : amount;

  return (
    <div className="space-y-5">

      {/* ── Upsell Modal ── */}
      {showUpsell && !isHomeService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="text-center mb-4">
              <span className="text-3xl">⚡</span>
              <h3 className="text-lg font-bold text-text-primary mt-2">
                Get more for ₦{slashPrice.toLocaleString()}
              </h3>
              <p className="text-sm text-text-secondary mt-1">
                Upgrade from ₦{displayPrice.toLocaleString()} and unlock:
              </p>
            </div>

            <ul className="space-y-2 mb-5 text-sm text-text-primary">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>Instant email alerts when job openings near you match your skills</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>Priority notifications for jobs with accommodation, feeding, or perks in your states of interest</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>Higher visibility in search results — clients see you first</span>
              </li>
            </ul>

            <div className="bg-surface rounded-xl p-3 text-xs text-text-secondary mb-5">
              The ₦{displayPrice.toLocaleString()} plan is still great — we guarantee minimum 20 opportunities/week from our large and growing user base. The upgrade just puts you first in line.
            </div>

            <div className="space-y-2">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => {
                  setUpsellAccepted(true);
                  setShowUpsell(false);
                }}
              >
                Upgrade to ₦{slashPrice.toLocaleString()}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setUpsellAccepted(false);
                  setShowUpsell(false);
                }}
              >
                Continue with ₦{displayPrice.toLocaleString()}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-1">
          Complete your payment
        </h2>
        <p className="text-sm text-text-secondary">
          {isHomeService
            ? `Monthly subscription — ₦${finalAmount.toLocaleString()}/month`
            : `One-time payment of ₦${finalAmount.toLocaleString()}. No monthly fees, no renewals.`}
        </p>
        {upsellAccepted && !isHomeService && (
          <p className="text-xs text-primary font-medium mt-1">
            ⚡ Premium plan selected
          </p>
        )}
      </div>

      <div className="flex gap-2">
        {(["paystack", "manual"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setPaymentMethod(m)}
            className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
              paymentMethod === m
                ? "border-primary bg-primary/5 text-primary"
                : "border-gray-100 text-text-secondary hover:border-gray-200"
            }`}
          >
            {m === "paystack" ? "Pay with Paystack" : "Manual Transfer"}
          </button>
        ))}
      </div>

      {paymentMethod === "paystack" && (
        <div className="space-y-3">
          <div className="bg-surface rounded-xl p-4 text-sm text-text-secondary">
            You'll be redirected to Paystack's secure checkout.
          </div>
          <Button variant="primary" className="w-full" onClick={handlePaystackPay}>
            Pay ₦{finalAmount.toLocaleString()} Now
          </Button>
        </div>
      )}

      {paymentMethod === "manual" && (
        <div className="space-y-3">
          <div className="bg-surface rounded-xl p-4 space-y-2 text-sm">
            {bankDetails ? (
              <>
                <p className="text-text-secondary">Transfer to this account:</p>
                <p className="font-semibold text-text-primary">{bankDetails.bank_name}</p>
                <p className="font-mono text-lg text-text-primary">{bankDetails.account_number}</p>
                <p className="text-text-secondary">{bankDetails.account_name}</p>
                <div className="border-t border-gray-100 pt-2 mt-2">
                  <p className="text-text-secondary">Use your User ID as payment reference:</p>
                  <p className="font-mono text-primary font-semibold break-all">{userId}</p>
                </div>
                <div className="border-t border-gray-100 pt-2 mt-2">
                  <p className="text-text-secondary">Amount to transfer:</p>
                  <p className="font-bold text-lg text-text-primary">₦{finalAmount.toLocaleString()}</p>
                </div>
              </>
            ) : (
              <p className="text-text-secondary">Loading bank details...</p>
            )}
          </div>
          <Button
            variant="primary"
            className="w-full"
            isLoading={isLoading}
            onClick={handleManualSubmit}
          >
            I've sent the payment
          </Button>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() =>
          isArtisan ? setStep("skills") : isHomeService ? setStep("hs_plan") : setStep("setup")
        }
      >
        Back
      </Button>
    </div>
  );
}