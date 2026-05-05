"use client";
import { useSessionStore } from "@/store/sessionStore";
import { DashboardSidebar } from "./DashboardSidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useSessionStore();
  if (!user || user.account_status !== "active") return <>{children}</>;
  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}