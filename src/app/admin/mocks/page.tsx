"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Avatar } from "@/components/ui/Avatar";
import { useUIStore } from "@/store/uiStore";
import type { Profile } from "@/types/profile";

export default function AdminMocksPage() {
  const { addToast } = useUIStore();
  const [mocks, setMocks] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState("Lagos");

  useEffect(() => {
    fetchMocks();
  }, [selectedState]);

  async function fetchMocks() {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("is_mock", true)
      .eq("mock_state", selectedState)
      .limit(50);
    if (data) setMocks(data as Profile[]);
    setLoading(false);
  }

  async function createMock() {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").insert([
      {
        full_name: `Mock ${Math.floor(Math.random() * 1000)}`,
        email: `mock${Date.now()}@test.com`,
        is_mock: true,
        mock_state: selectedState,
        is_client: true,
      },
    ]);
    if (error) {
      addToast("Failed to create mock", "error");
    } else {
      addToast("Mock created", "success");
      fetchMocks();
    }
  }

  const states = ["Lagos", "Abuja", "Kano", "Rivers", "Oyo", "Enugu"];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">
        Mock Profiles
      </h1>

      <div className="flex items-center gap-4 mb-6">
        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm"
        >
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button variant="primary" size="sm" onClick={createMock}>
          Create Mock
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {mocks.map((mock) => (
            <div
              key={mock.id}
              className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3"
            >
              <Avatar
                src={mock.profile_image_url}
                name={mock.full_name}
                size="md"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold text-text-primary">
                  {mock.full_name}
                </p>
                <p className="text-xs text-text-secondary">{mock.email}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
