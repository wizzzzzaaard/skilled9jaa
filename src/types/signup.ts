export type Step = "basic" | "role" | "setup" | "hs_services" | "hs_plan" | "skills" | "payment" | "pending" | "success";

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