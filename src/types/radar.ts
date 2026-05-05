export interface RadarProfile {
  id: string;
  full_name: string | null;
  profile_image_url: string | null;
  latitude: number;
  longitude: number;
  distance_km: number;
  ring: number;
  skill?: string;
  job_role?: string;
  company_name?: string | null;
  company_logo_url?: string | null;
  company_slug?: string | null;
  state?: string | null;
  city?: string | null;
  angle?: number;
  is_mock?: boolean;
  is_company?: boolean;
  is_hiring?: boolean;
  verification_status?: string | null;
}