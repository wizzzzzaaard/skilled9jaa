export interface NearProfile {
  id: string;
  full_name: string | null;
  profile_image_url: string | null;
  state: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  distance_km?: number;
  skills?: string[];
  job_roles?: string[];
  company_name?: string | null;
  company_logo_url?: string | null;
  job_count?: number;
}