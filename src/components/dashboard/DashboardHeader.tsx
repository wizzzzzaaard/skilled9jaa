"use client";

import { MapPin, ChevronDown, Bell } from "lucide-react";

interface Props {
  locationLabel: string;
}

export function DashboardHeader({ locationLabel }: Props) {
  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-2">
      <button className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5 text-sm font-medium text-text-primary">
        <MapPin className="w-3.5 h-3.5 text-primary" />
        {locationLabel}
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </button>

      <button className="relative p-2 rounded-full bg-gray-50 border border-gray-100">
        <Bell className="w-4 h-4 text-text-primary" />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
      </button>
    </div>
  );
}