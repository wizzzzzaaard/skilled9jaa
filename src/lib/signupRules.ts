import { normalizeNgPhone } from "@/lib/utils/phone";

/** Rules shared by the landing-page form and the full signup flow. */
export type AccountFields = { fullName: string; phone: string; email: string; password: string; consent: boolean };
export type AccountErrors = Partial<Record<keyof AccountFields, string>>;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateAccount(v: AccountFields): AccountErrors {
  const e: AccountErrors = {};
  const name = v.fullName.trim().replace(/\s+/g, " ");
  if (name.length < 3 || !name.includes(" ")) e.fullName = "Enter your first and last name.";
  else if (name.length > 80) e.fullName = "Keep your name under 80 characters.";
  if (!normalizeNgPhone(v.phone)) e.phone = "Enter a Nigerian mobile number, for example 0803 123 4567.";
  if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter an email address like name@example.com.";
  if (v.password.length < 8) e.password = "Use at least 8 characters.";
  else if (!/[A-Za-z]/.test(v.password) || !/\d/.test(v.password)) e.password = "Use at least one letter and one number.";
  if (!v.consent) e.consent = "Tick the box to agree before you continue.";
  return e;
}

/** Turns Supabase sign-up errors into plain directions. */
export function explainSignupError(message: string): { text: string; login?: boolean } {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("user already exists"))
    return { text: "This email already has an account.", login: true };
  if (m.includes("rate limit") || m.includes("too many")) return { text: "Too many attempts from this network. Wait a minute, then try again." };
  if (m.includes("password")) return { text: message };
  if (m.includes("fetch") || m.includes("network")) return { text: "Can't reach Skilled9ja. Check your data connection and try again." };
  return { text: "Couldn't create your account. Try again in a moment." };
}
