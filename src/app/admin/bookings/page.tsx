"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/format";
import type { Booking } from "@/types/booking";

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBookings() {
      const supabase = createClient();
      const { data } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setBookings(data as Booking[]);
      setLoading(false);
    }
    fetchBookings();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">
        Bookings
      </h1>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : bookings.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary">
                  ID
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary">
                  Amount
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-text-primary font-mono">
                    {booking.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 text-sm text-text-primary">
                    {formatCurrency(booking.total_amount)}
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant={
                        booking.status === "completed"
                          ? "success"
                          : booking.status === "pending"
                          ? "warning"
                          : booking.status === "cancelled"
                          ? "error"
                          : "default"
                      }
                    >
                      {booking.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {new Date(booking.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-text-secondary bg-white rounded-xl border border-gray-100">
          No bookings found
        </div>
      )}
    </div>
  );
}
