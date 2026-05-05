"use client";

import { useSession } from "@/lib/hooks/useSession";
import { PageLoader } from "@/components/layout/PageLoader";
import { useSessionStore } from "@/store/sessionStore";
import { Button } from "@/components/ui/Button";
import { LogOut } from "lucide-react";

export default function SettingsPage() {
  const { isLoading } = useSession();
  const { signOut } = useSessionStore();

  if (isLoading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-semibold text-text-primary mb-6">
          Settings
        </h1>

        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Account
            </h3>
            <Button
              variant="outline"
              onClick={() => signOut()}
              className="text-error border-error hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
