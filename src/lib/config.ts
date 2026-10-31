/**
 * Free signup: everyone gets in without paying, and paid plans are offered
 * from the dashboard instead (see the payments plan).
 * Set NEXT_PUBLIC_FREE_SIGNUP=false in Netlify to bring back the old
 * pay-before-entry flow for artisans and home-service providers.
 */
export const FREE_SIGNUP = process.env.NEXT_PUBLIC_FREE_SIGNUP !== "false";

/** How long to wait for Paystack's webhook to activate an account after payment. */
export const PAYMENT_CONFIRM_TIMEOUT_MS = 60_000;
