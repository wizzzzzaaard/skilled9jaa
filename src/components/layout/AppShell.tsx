"use client";
import { usePathname } from "next/navigation";
import { useSessionStore } from "@/store/sessionStore";
import { hidesSiteChrome } from "@/lib/layout";
import { DashboardSidebar } from "./DashboardSidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useSessionStore();
  const pathname = usePathname();
  if (!user || user.account_status !== "active" || hidesSiteChrome(pathname)) return <>{children}</>;
  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}