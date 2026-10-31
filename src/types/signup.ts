export type Step =
  | "intro"
  | "role"
  | "basic"
  | "check_email"
  | "setup"
  | "skills"
  | "hs_services"
  | "hs_plan"
  | "payment"
  | "pending"
  | "success";

export interface BankDetails {
  bank_name: string;
  account_number: string;
  account_name: string;
}

export interface Skill {
  id: number;
  name: string;
  type: string;
}

/** What the person wants to do on Skilled9ja. */
export type SignupPath = "work" | "hire_pro" | "hire_staff" | "home_service";
