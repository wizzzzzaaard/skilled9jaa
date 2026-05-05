"use client";

import { Button } from "@/components/ui/Button";
import { Calendar, MapPin } from "lucide-react";

export default function BookClient() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h1 className="text-xl font-semibold text-text-primary mb-2">
            You&apos;ve been invited
          </h1>
          <p className="text-text-secondary mb-6">
            A provider has invited you to book their service on Skilled9ja.
          </p>

          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <Calendar className="w-5 h-5 text-primary" />
              <span>Schedule at your preferred time</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <MapPin className="w-5 h-5 text-primary" />
              <span>Service at your location</span>
            </div>
          </div>

          <Button variant="primary" className="w-full">
            Accept & Book
          </Button>
        </div>
      </div>
    </div>
  );
}
