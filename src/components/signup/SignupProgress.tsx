"use client";

interface StepItem {
  key: string;
  label: string;
}

interface Props {
  steps: StepItem[];
  stepIndex: number;
}

export function SignupProgress({ steps, stepIndex }: Props) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, i) => (
        <div key={s.key} className="flex-1 flex flex-col items-center gap-1">
          <div
            className={`h-1.5 w-full rounded-full transition-colors ${
              i <= stepIndex ? "bg-primary" : "bg-gray-200"
            }`}
          />
          <span className="text-[10px] text-text-secondary hidden sm:block">
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}