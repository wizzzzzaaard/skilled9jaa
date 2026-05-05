"use client";

interface Props {
  selected: boolean;
  onClick: () => void;
  title: string;
  badge: string;
  badgeVariant: "green" | "muted";
  description: string;
}

export function RoleCard({
  selected,
  onClick,
  title,
  badge,
  badgeVariant,
  description,
}: Props) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border-2 text-left transition-all w-full ${
        selected
          ? "border-primary bg-primary/5"
          : "border-gray-100 hover:border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-text-primary">{title}</span>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            badgeVariant === "green"
              ? "bg-accent/20 text-accent"
              : "bg-primary/10 text-primary"
          }`}
        >
          {badge}
        </span>
      </div>
      <p className="text-sm text-text-secondary">{description}</p>
    </button>
  );
}