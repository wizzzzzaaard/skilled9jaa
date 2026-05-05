"use client";

import { Button } from "@/components/ui/Button";

interface Props {
  selectedCategoryCount: number;
  plan: "growth" | "business" | "unlimited";
  setPlan: (p: "growth" | "business" | "unlimited") => void;
  onSubmit: () => void;
  onBack: () => void;
}

const plans = [
  {
    key: "growth" as const,
    label: "Growth",
    extra: 0,
    description: "Perfect for solo providers just starting out",
    staff: "Individual only",
  },
  {
    key: "business" as const,
    label: "Business",
    extra: 5000,
    description: "Grow your team and manage more clients",
    staff: "Up to 5 staff",
  },
  {
    key: "unlimited" as const,
    label: "Unlimited",
    extra: 10000,
    description: "Full scale operations with no limits",
    staff: "Up to 10 staff",
  },
];

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString()}`;
}

export function HsPlanStep({
  selectedCategoryCount,
  plan,
  setPlan,
  onSubmit,
  onBack,
}: Props) {
  const base = selectedCategoryCount * 1000;

  return (
    <div>
      <h2 className="text-lg font-semibold text-text-primary mb-1">
        Choose your plan
      </h2>
      <p className="text-sm text-text-secondary mb-4">
        Base cost: {formatNaira(1000)} × {selectedCategoryCount} service{selectedCategoryCount !== 1 ? "s" : ""} = {formatNaira(base)}
      </p>

      <div className="space-y-3 mb-6">
        {plans.map((p) => {
          const total = base + p.extra;
          const selected = plan === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setPlan(p.key)}
              className={`w-full rounded-xl border p-4 text-left transition-all ${
                selected
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 bg-white hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    selected ? "border-primary" : "border-gray-300"
                  }`}>
                    {selected && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <span className="font-semibold text-text-primary">{p.label}</span>
                </div>
                <span className="font-bold text-text-primary">{formatNaira(total)}</span>
              </div>
              <p className="text-xs text-text-secondary ml-6">{p.description}</p>
              <p className="text-xs text-primary font-medium ml-6 mt-0.5">{p.staff}</p>
              {p.extra > 0 && (
                <p className="text-xs text-text-secondary ml-6 mt-0.5">
                  Base {formatNaira(base)} + {formatNaira(p.extra)}/mo platform fee
                </p>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          Back
        </Button>
        <Button type="button" variant="primary" className="flex-1" onClick={onSubmit}>
          Continue to Payment
        </Button>
      </div>
    </div>
  );
}