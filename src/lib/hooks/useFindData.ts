"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLocationStore } from "@/store/locationStore";
import { haversine } from "@/lib/utils/distance";
import type { NearProfile } from "@/types/find";

export function useFindData() {
  const { latitude, longitude, requestLocation } = useLocationStore();

  const [companies, setCompanies] = useState<NearProfile[]>([]);
  const [artisans, setArtisans] = useState<NearProfile[]>([]);
  const [employees, setEmployees] = useState<NearProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  const userLat = latitude || 6.5244;
  const userLng = longitude || 3.3792;

  useEffect(() => {
    requestLocation();
  }, []);

  function withDistance(items: NearProfile[]) {
    return items
      .map((p) => ({
        ...p,
        distance_km:
          p.latitude && p.longitude
            ? haversine(userLat, userLng, p.latitude, p.longitude)
            : 9999,
      }))
      .sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0))
      .slice(0, 15);
  }

  async function fetchAll() {
    setLoading(true);
    const supabase = createClient();

    const [{ data: companyData }, { data: artisanData }, { data: employeeData }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select(
            `id, full_name, company_name, company_logo_url,
             profile_image_url, latitude, longitude, state, city`
          )
          .not("company_name", "is", null)
          .not("latitude", "is", null)
          .eq("account_status", "active"),

        supabase
          .from("profiles")
          .select(
            `id, full_name, profile_image_url,
             latitude, longitude, state, city,
             user_skills(skill_id, skills(name, type))`
          )
          .eq("is_artisan", true)
          .eq("account_status", "active")
          .not("latitude", "is", null)
          .limit(50),

        supabase
          .from("profiles")
          .select(
            `id, full_name, profile_image_url,
             latitude, longitude, state, city,
             user_skills(skill_id, skills(name, type))`
          )
          .eq("is_artisan", true)
          .eq("account_status", "active")
          .not("latitude", "is", null)
          .limit(50),
      ]);

    if (companyData) {
      setCompanies(withDistance(companyData as NearProfile[]));
    }

    if (artisanData) {
      const filtered = (artisanData as any[])
        .filter((p) => p.user_skills?.some((us: any) => us.skills?.type === "SKILL"))
        .map((p) => ({
          ...p,
          skills: p.user_skills
            ?.filter((us: any) => us.skills?.type === "SKILL")
            .map((us: any) => us.skills?.name)
            .filter(Boolean),
        }));
      setArtisans(withDistance(filtered));
    }

    if (employeeData) {
      const filtered = (employeeData as any[])
        .filter((p) => p.user_skills?.some((us: any) => us.skills?.type === "JOB"))
        .map((p) => ({
          ...p,
          job_roles: p.user_skills
            ?.filter((us: any) => us.skills?.type === "JOB")
            .map((us: any) => us.skills?.name)
            .filter(Boolean),
        }));
      setEmployees(withDistance(filtered));
    }

    setLoading(false);
  }

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchAll();
  }, [latitude, longitude]);

  return { companies, artisans, employees, loading, refetch: fetchAll };
}