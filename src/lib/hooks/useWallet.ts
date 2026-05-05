"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

interface Wallet {
  id: string;
  balance: number;
  escrow_balance: number;
  total_earned: number;
  total_withdrawn: number;
}

export function useWallet(userId?: string) {
  return useQuery<Wallet | null>({
    queryKey: ["wallet", userId],
    queryFn: async () => {
      if (!userId) return null;
      const supabase = createClient();
      const { data } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .single();
      return data as Wallet | null;
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}
