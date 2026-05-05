"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { NearbyProvider } from "@/types/profile";

interface UseNearbyProvidersOptions {
  latitude: number;
  longitude: number;
  radiusKm?: number;
}

export function useNearbyProviders({
  latitude,
  longitude,
  radiusKm = 10,
}: UseNearbyProvidersOptions) {
  return useQuery<NearbyProvider[]>({
    queryKey: ["nearby-providers", latitude, longitude, radiusKm],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_nearby_providers", {
        p_lat: latitude,
        p_lng: longitude,
        p_radius_km: radiusKm,
      });
      if (error) throw error;
      return (data as NearbyProvider[]) || [];
    },
    enabled: !!latitude && !!longitude,
    staleTime: 30 * 1000,
  });
}
