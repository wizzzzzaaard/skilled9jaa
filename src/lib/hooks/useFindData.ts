"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLocationStore } from "@/store/locationStore";
import { haversine, nearestFirst, withinBox, movedMoreThan, type Box } from "@/lib/utils/distance";
import type { NearProfile } from "@/types/find";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

export function useFindData() {
  const { latitude, longitude, requestLocation } = useLocationStore();

  const [companies, setCompanies] = useState<NearProfile[]>([]);
  const [artisans, setArtisans] = useState<NearProfile[]>([]);
  const [employees, setEmployees] = useState<NearProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const lastSearch = useRef<{ lat: number; lng: number } | null>(null);

  const userLat = latitude || 6.5244;
  const userLng = longitude || 3.3792;

  useEffect(() => {
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function withDistance(items: NearProfile[]) {
    return items
      .map((p) => ({
        ...p,
        distance_km: p.latitude && p.longitude ? haversine(userLat, userLng, p.latitude, p.longitude) : 9999,
      }))
      .sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0))
      .slice(0, 15);
  }

  async function fetchAll() {
    setLoading(true);
    const supabase = createClient();

    const companyQuery = (box: Box | null) =>
      withinBox(
        supabase
          .from("profiles")
          .select("id, full_name, company_name, company_logo_url, profile_image_url, latitude, longitude, state, city")
          .not("company_name", "is", null)
          .not("latitude", "is", null)
          .eq("account_status", "active"),
        box,
      ).limit(100);

    // One query for people; split into artisans (SKILL) and job seekers (JOB) below.
    const peopleQuery = (box: Box | null) =>
      withinBox(
        supabase
          .from("profiles")
          .select("id, full_name, profile_image_url, latitude, longitude, state, city, user_skills(skill_id, skills(name, type))")
          .eq("is_artisan", true)
          .eq("account_status", "active")
          .not("latitude", "is", null),
        box,
      ).limit(150);

    try {
      const [companyData, peopleData] = await Promise.all([
        nearestFirst<Row>(userLat, userLng, companyQuery),
        nearestFirst<Row>(userLat, userLng, peopleQuery, 30),
      ]);

      setCompanies(withDistance(companyData as NearProfile[]));

      const namesOf = (p: Row, type: "SKILL" | "JOB") =>
        (p.user_skills ?? [])
          .filter((us: Row) => us.skills?.type === type)
          .map((us: Row) => us.skills?.name)
          .filter(Boolean);

      setArtisans(
        withDistance(
          peopleData.filter((p: Row) => namesOf(p, "SKILL").length).map((p: Row) => ({ ...p, skills: namesOf(p, "SKILL") })),
        ),
      );
      setEmployees(
        withDistance(
          peopleData.filter((p: Row) => namesOf(p, "JOB").length).map((p: Row) => ({ ...p, job_roles: namesOf(p, "JOB") })),
        ),
      );
    } finally {
      lastSearch.current = { lat: userLat, lng: userLng };
      setLoading(false);
    }
  }

  // Search again when the real location arrives (the first search may use the Lagos default).
  useEffect(() => {
    if (!movedMoreThan(lastSearch.current, userLat, userLng, 1)) return;
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLat, userLng]);

  return { companies, artisans, employees, loading, refetch: fetchAll };
}
