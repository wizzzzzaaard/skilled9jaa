"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/profile";

export function useProfile(userId?: string) {
  return useQuery<Profile | null>({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      return data as Profile | null;
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}
