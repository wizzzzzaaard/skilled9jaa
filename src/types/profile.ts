export type ProfileMode = "client" | "artisan" | "home_service_provider" | "company";

export type AccountStatus =
  | "incomplete"
  | "pending_payment"
  | "pending_manual"
  | "pending_verify"
  | "active"
  | "suspended"
  | "rejected";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  slug: string | null;
  company_slug: string | null;
  profile_image_url: string | null;
  bio: string | null;
  state: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  is_client: boolean;
  is_artisan: boolean;
  is_company: boolean;
  is_home_service_provider: boolean;
  is_admin: boolean;
  active_mode: ProfileMode;
  account_status: AccountStatus;
  payment_status: string | null;
  verification_status: string | null;
  nin_number: string | null;
  nin_name_match: boolean;
  face_verified: boolean;
  is_available_now: boolean;
  is_mock: boolean;
  mock_state: string | null;
 is_published: boolean;
signup_step: number | null;
  years_of_experience: number | null;
  company_name: string | null;
  company_description: string | null;
  company_website: string | null;
  company_size: string | null;
  company_logo_url: string | null;
  industry: string | null;        
  business_type: string | null;   
  subscription_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserLocation {
  id: string;
  user_id: string;
  label: string;
  address: string;
  state: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
}

export interface NearbyProvider {
  id: string;
  full_name: string;
  slug: string;
  profile_image_url: string | null;
  bio: string | null;
  latitude: number;
  longitude: number;
  distance: number;
  is_available_now: boolean;
  is_mock: boolean;
  active_mode: ProfileMode;
  account_status: AccountStatus;
}