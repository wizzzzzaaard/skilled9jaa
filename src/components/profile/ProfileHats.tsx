"use client";
import { useSessionStore } from "@/store/sessionStore";
import type { ProfileMode } from "@/types/profile";
import { cn } from "@/lib/utils/cn";

const modeLabels: Record<ProfileMode, string> = {
  client: "Client",
  artisan: "Artisan",
  home_service_provider: "Home Service",
  company: "Company",
};

export function ProfileHats() {
  const { user, switchMode } = useSessionStore();
  if (!user) return null;

  const availableModes: ProfileMode[] = [
    user.is_client && "client",
    user.is_artisan && "artisan",
    user.is_home_service_provider && "home_service_provider",
    user.is_company && "company",
  ].filter(Boolean) as ProfileMode[];

  if (availableModes.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
      <span className="text-xs text-text-secondary shrink-0">Mode:</span>
      {availableModes.map((mode) => (
        <button
          key={mode}
          onClick={() => switchMode(mode)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0",
            user.active_mode === mode
              ? "bg-primary text-white"
              : "bg-gray-100 text-text-secondary hover:bg-gray-200"
          )}
        >
          {modeLabels[mode]}
        </button>
      ))}
    </div>
  );
}