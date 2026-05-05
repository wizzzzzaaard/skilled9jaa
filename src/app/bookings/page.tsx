"use client";

import { useSession } from "@/lib/hooks/useSession";
import { PageLoader } from "@/components/layout/PageLoader";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { Calendar } from "lucide-react";

export default function BookingsPage() {
  const { user, isLoading } = useSession();

  if (isLoading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-semibold text-text-primary mb-6">
          My Bookings
        </h1>

        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            No bookings yet
          </h3>
          <p className="text-text-secondary mb-6">
            {user?.active_mode === "client"
              ? "Book your first service to get started"
              : "Bookings will appear here when clients book your services"}
          </p>
          {user?.active_mode === "client" && (
            <Link href="/find">
              <Button variant="primary">Find a Service</Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
