"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { haversineDistance, getRingForDistance } from "@/lib/utils/distance";
import type { RadarProfile } from "@/types/radar";

interface User {
  is_artisan: boolean;
  is_company: boolean;
  city?: string | null;
  state?: string | null;
}

export function useDashboardData(user: User | null, userLat: number, userLng: number) {
  const [profiles, setProfiles] = useState<RadarProfile[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const hasFetched = useRef(false);

  const fetchProfiles = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    const supabase = createClient();
    let data: RadarProfile[] = [];

    if (user.is_artisan) {
      // Artisans see closest companies
      const { data: res } = await supabase
        .from("profiles")
        .select("id, full_name, company_name, company_logo_url, company_slug, profile_image_url, latitude, longitude, state, city, is_mock, verification_status, is_company")
        .eq("is_company", true)
        .not("latitude", "is", null)
        .eq("account_status", "active")
        .limit(200);

      if (res) {
        data = res.map((p) => ({
          ...p,
          is_company: true,
          is_hiring: true, // will enhance with jobs count later
          distance_km: haversineDistance(userLat, userLng, p.latitude!, p.longitude!),
          ring: 1,
        }));
      }
    } else if (user.is_company) {
      // Companies see closest artisans AND companies
      const [{ data: artisans }, { data: companies }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, profile_image_url, latitude, longitude, state, city, is_mock, verification_status, user_skills(skill_id, skills(name, type))")
          .eq("is_artisan", true)
          .eq("account_status", "active")
          .not("latitude", "is", null)
          .limit(100),
        supabase
          .from("profiles")
          .select("id, full_name, company_name, company_logo_url, company_slug, profile_image_url, latitude, longitude, state, city, is_mock, verification_status")
          .eq("is_company", true)
          .eq("account_status", "active")
          .not("latitude", "is", null)
          .limit(100),
      ]);

      const artisanData: RadarProfile[] = (artisans || []).map((p: any) => {
        const skillItems = p.user_skills || [];
        const skillSkill = skillItems.find((us: any) => us.skills?.type === "SKILL");
        const jobSkill = skillItems.find((us: any) => us.skills?.type === "JOB");
        return {
          ...p,
          skill: skillSkill?.skills?.name,
          job_role: jobSkill?.skills?.name,
          is_company: false,
          distance_km: haversineDistance(userLat, userLng, p.latitude!, p.longitude!),
          ring: 1,
        };
      });

      const companyData: RadarProfile[] = (companies || []).map((p) => ({
        ...p,
        is_company: true,
        distance_km: haversineDistance(userLat, userLng, p.latitude!, p.longitude!),
        ring: 1,
      }));

      data = [...artisanData, ...companyData];
    } else {
      // Clients see closest artisans/home service providers
      const { data: res } = await supabase
        .from("profiles")
        .select("id, full_name, profile_image_url, latitude, longitude, state, city, is_mock, verification_status, user_skills(skill_id, skills(name, type))")
        .eq("is_artisan", true)
        .not("latitude", "is", null)
        .limit(200);

      if (res) {
        data = (res as any[]).map((p) => {
          const skillItems = p.user_skills || [];
          const skillSkill = skillItems.find((us: any) => us.skills?.type === "SKILL");
          const jobSkill = skillItems.find((us: any) => us.skills?.type === "JOB");
          return {
            ...p,
            skill: skillSkill?.skills?.name,
            job_role: jobSkill?.skills?.name,
            is_company: false,
            distance_km: haversineDistance(userLat, userLng, p.latitude!, p.longitude!),
            ring: 1,
          };
        });
      }
    }

    const sorted = data
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, 15)
      .map((p) => ({
        ...p,
        ring: getRingForDistance(p.distance_km),
      }));

    setProfiles(sorted);
    setDataLoading(false);
  }, [user, userLat, userLng]);

  useEffect(() => {
    if (!user || hasFetched.current) return;
    hasFetched.current = true;
    fetchProfiles();
  }, [user, fetchProfiles]);

  return { profiles, dataLoading, refetch: fetchProfiles };
}