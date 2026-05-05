export type BookingStatus =
  | "pending"
  | "confirmed"
  | "started"
  | "completed"
  | "cancelled"
  | "disputed"
  | "refunded";

export type BookingType = "at_home" | "at_event";

export interface Booking {
  id: string;
  client_id: string;
  provider_id: string;
  staff_id: string | null;
  service_option_id: string | null;
  category_id: string | null;
  booking_type: BookingType;
  description: string | null;
  scheduled_at: string;
  duration_mins: number;
  client_location_id: string | null;
  event_address: string | null;
  event_state: string | null;
  event_city: string | null;
  service_lat: number | null;
  service_lng: number | null;
  service_amount: number;
  transport_fee: number;
  platform_fee: number;
  total_amount: number;
  distance_km: number | null;
  status: BookingStatus;
  payment_ref: string | null;
  paid_at: string | null;
  work_started_at: string | null;
  work_completed_at: string | null;
  client_rating: number | null;
  client_review: string | null;
  created_at: string;
}

export interface BookingStartCode {
  id: string;
  booking_id: string;
  code: string;
  attempts: number;
  max_attempts: number;
  is_used: boolean;
  used_at: string | null;
}

export interface ServiceOption {
  id: string;
  provider_id: string;
  category_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  is_quote_based: boolean;
  duration_mins: number;
  booking_type: BookingType;
  is_active: boolean;
}
