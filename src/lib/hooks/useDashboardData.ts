"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { haversineDistance, getRingForDistance, nearestFirst, withinBox, movedMoreThan, rankNearby } from "@/lib/utils/distance";
import type { RadarProfile } from "@/types/radar";

interface User {
  is_artisan: boolean;
  is_company: boolean;
  city?: string | null;
  state?: string | null;
}

const COMPANY_FIELDS =
  "id, full_name, company_name, company_logo_url, company_slug, profile_image_url, latitude, longitude, state, city, is_mock, verification_status, is_company";
const PERSON_FIELDS =
  "id, full_name, profile_image_url, latitude, longitude, state, city, is_mock, verification_status, payment_status, user_skills(skill_id, skills(name, type))";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

function withSkills(p: Row, userLat: number, userLng: number): RadarProfile {
  const skillItems = p.user_skills || [];
  const skillSkill = skillItems.find((us: Row) => us.skills?.type === "SKILL");
  const jobSkill = skillItems.find((us: Row) => us.skills?.type === "JOB");
  return {
    ...p,
    skill: skillSkill?.skills?.name,
    job_role: jobSkill?.skills?.name,
    is_company: false,
    distance_km: haversineDistance(userLat, userLng, p.latitude, p.longitude),
    ring: 1,
  };
}

export function useDashboardData(user: User | null, userLat: number, userLng: number) {
  const [profiles, setProfiles] = useState<RadarProfile[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  // Where we last searched from. The first search often uses the default
  // (Lagos) before GPS answers; search again once the real location arrives.
  const lastSearch = useRef<{ lat: number; lng: number } | null>(null);

  const fetchProfiles = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    const supabase = createClient();
    const companies = (box: Parameters<typeof withinBox>[1]) =>
      withinBox(
        supabase.from("profiles").select(COMPANY_FIELDS).eq("is_company", true).eq("account_status", "active").not("latitude", "is", null),
        box,
      ).limit(200);
    const people = (box: Parameters<typeof withinBox>[1]) =>
      withinBox(
        supabase.from("profiles").select(PERSON_FIELDS).eq("is_artisan", true).eq("account_status", "active").not("latitude", "is", null),
        box,
      ).limit(200);

    let data: RadarProfile[] = [];
    try {
      if (user.is_artisan) {
        // Artisans and job seekers see the closest companies
        const res = await nearestFirst<Row>(userLat, userLng, companies);
        data = res.map((p) => ({
          ...p,
          is_company: true,
          is_hiring: true,
          distance_km: haversineDistance(userLat, userLng, p.latitude, p.longitude),
          ring: 1,
        }));
      } else if (user.is_company) {
        // Companies see the closest people and other companies
        const [ppl, cos] = await Promise.all([
          nearestFirst<Row>(userLat, userLng, people),
          nearestFirst<Row>(userLat, userLng, companies),
        ]);
        data = [
          ...ppl.map((p) => withSkills(p, userLat, userLng)),
          ...cos.map((p) => ({
            ...p,
            is_company: true,
            distance_km: haversineDistance(userLat, userLng, p.latitude, p.longitude),
            ring: 1,
          })),
        ];
      } else {
        // Clients see the closest active pros (previously unfinished accounts showed too)
        const res = await nearestFirst<Row>(userLat, userLng, people);
        data = res.map((p) => withSkills(p, userLat, userLng));
      }
    } catch {
      data = [];
    }

    // Nearest first; paid profiles lead within each distance band.
    const sorted = rankNearby(data as (RadarProfile & { payment_status?: string | null })[])
      .slice(0, 15)
      .map((p) => ({ ...p, ring: getRingForDistance(p.distance_km) }));

    lastSearch.current = { lat: userLat, lng: userLng };
    setProfiles(sorted);
    setDataLoading(false);
  }, [user, userLat, userLng]);

  useEffect(() => {
    if (!user) return;
    if (!movedMoreThan(lastSearch.current, userLat, userLng, 1)) return;
    fetchProfiles();
  }, [user, userLat, userLng, fetchProfiles]);

  return { profiles, dataLoading, refetch: fetchProfiles };
}
