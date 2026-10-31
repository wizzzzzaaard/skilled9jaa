"use client";

import type { SignupState } from "@/lib/hooks/useSignup";
import { PaymentPanel } from "@/components/payments/PaymentPanel";

/** Only shown when free signup is switched off (NEXT_PUBLIC_FREE_SIGNUP=false). */
export function PaymentStep({ s: f }: { s: SignupState }) {
  if (!f.userId) return null;
  const n = f.selectedHsCategoryIds.length;
  const p = f.pricing;
  const lines = f.isHomeService && p
    ? [
        { label: `${n} service${n === 1 ? "" : "s"} × ₦${p.hsPerService.toLocaleString("en-NG")}`, amount: Math.max(n, 1) * p.hsPerService },
        ...(f.hsPlan === "business" ? [{ label: "Business plan", amount: p.hsBusiness }] : []),
        ...(f.hsPlan === "unlimited" ? [{ label: "Unlimited plan", amount: p.hsUnlimited }] : []),
      ]
    : [{ label: "Paid profile", amount: f.amountDue }];
  return (
    <PaymentPanel
      title="Pay to put your profile live"
      lines={lines}
      total={f.amountDue}
      period={f.isHomeService ? (f.hsPlan === "unlimited" ? "year" : "month") : "once"}
      benefits={["Your profile goes live to people near you", "Your work posts are visible to everyone", "Shown above free profiles near you"]}
      pricing={f.pricing}
      bank={f.bankDetails}
      userId={f.userId}
      method={f.paymentMethod}
      setMethod={f.setPaymentMethod}
      onPaystack={f.handlePaystackPay}
      onTransferSent={f.handleManualSubmit}
      busy={f.isLoading}
      confirming={f.confirmingPayment}
      error={f.paymentError}
      onBack={f.goBack}
    />
  );
}
