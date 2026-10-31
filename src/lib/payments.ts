"use client";

import { createClient } from "@/lib/supabase/client";

/** Order types the live Paystack webhook knows how to activate. */
export type OrderType = "artisan_subscription" | "home_growth" | "home_business" | "home_unlimited" | "company_subscription";

export interface Pricing {
  /** One-time paid profile for artisans and job seekers (₦). */
  artisanPrice: number;
  /** Home service: price per service per month, and the plan add-ons (₦). */
  hsPerService: number;
  hsBusiness: number;
  hsUnlimited: number;
  paystackEnabled: boolean;
  manualEnabled: boolean;
  paystackKey: string | null;
}

export interface BankDetails {
  bank_name: string;
  account_number: string;
  account_name: string;
}

const DEFAULT_PRICING: Pricing = {
  artisanPrice: 3550,
  hsPerService: 1000,
  hsBusiness: 5000,
  hsUnlimited: 10000,
  paystackEnabled: true,
  manualEnabled: true,
  paystackKey: null,
};

/** Prices come from Admin › Settings, never from code. */
export async function loadPricing(): Promise<Pricing> {
  const supabase = createClient();
  const { data } = await supabase
    .from("platform_settings")
    .select("skilled9ja_display_price, home_growth_price, home_business_price, home_unlimited_price, paystack_enabled, manual_payment_enabled, paystack_public_key")
    .maybeSingle();
  if (!data) return DEFAULT_PRICING;
  return {
    artisanPrice: Number(data.skilled9ja_display_price) || DEFAULT_PRICING.artisanPrice,
    hsPerService: Number(data.home_growth_price) || DEFAULT_PRICING.hsPerService,
    hsBusiness: Number(data.home_business_price) || DEFAULT_PRICING.hsBusiness,
    hsUnlimited: Number(data.home_unlimited_price) || DEFAULT_PRICING.hsUnlimited,
    paystackEnabled: data.paystack_enabled !== false && !!data.paystack_public_key,
    manualEnabled: data.manual_payment_enabled !== false,
    paystackKey: data.paystack_public_key ?? null,
  };
}

export async function loadBankDetails(): Promise<BankDetails | null> {
  const supabase = createClient();
  const { data } = await supabase.from("payment_details").select("bank_name, account_number, account_name").eq("is_active", true).maybeSingle();
  return (data as BankDetails) ?? null;
}

export function homeServiceTotal(p: Pricing, services: number, plan: "growth" | "business" | "unlimited"): number {
  const base = Math.max(services, 1) * p.hsPerService;
  return base + (plan === "business" ? p.hsBusiness : plan === "unlimited" ? p.hsUnlimited : 0);
}

/** Short code people type as the transfer narration; admins match on it. */
export function transferReference(userId: string): string {
  return `S9-${userId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

type PaystackHandler = { openIframe: () => void };
type PaystackPop = { setup: (opts: Record<string, unknown>) => PaystackHandler };

function loadPaystackScript(): Promise<PaystackPop> {
  const w = window as unknown as { PaystackPop?: PaystackPop };
  if (w.PaystackPop) return Promise.resolve(w.PaystackPop);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    const timer = window.setTimeout(() => reject(new Error("timeout")), 20000);
    script.onload = () => {
      window.clearTimeout(timer);
      w.PaystackPop ? resolve(w.PaystackPop) : reject(new Error("missing"));
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("blocked"));
    };
    document.body.appendChild(script);
  });
}

export type CheckoutResult = { status: "paid" } | { status: "closed" } | { status: "error"; message: string };

/**
 * Creates the order, then opens Paystack. Resolves when the pop-up reports
 * payment or is closed. The account itself is only upgraded by the webhook.
 */
export async function startPaystackCheckout(opts: {
  userId: string;
  email: string;
  amount: number;
  orderType: OrderType;
  pricing: Pricing;
}): Promise<CheckoutResult> {
  const { userId, email, amount, orderType, pricing } = opts;
  if (!pricing.paystackEnabled || !pricing.paystackKey) return { status: "error", message: "Card payment isn't available right now. Use bank transfer." };
  if (!Number.isFinite(amount) || amount <= 0) return { status: "error", message: "Couldn't work out the amount. Go back and choose your plan again." };

  const supabase = createClient();
  const { data: order, error } = await supabase
    .from("orders")
    .insert({ user_id: userId, amount, status: "pending", order_type: orderType })
    .select("id")
    .single();
  if (error || !order) return { status: "error", message: "Couldn't start the payment. Check your connection and try again." };

  let pop: PaystackPop;
  try {
    pop = await loadPaystackScript();
  } catch {
    return { status: "error", message: "Couldn't load Paystack. Check your connection, or turn off any ad blocker, and try again." };
  }

  // The webhook reads the order id after the first dash: "<timestamp>-<orderId>".
  const reference = `${Date.now()}-${order.id}`;
  return new Promise<CheckoutResult>((resolve) => {
    const handler = pop.setup({
      key: pricing.paystackKey,
      email,
      amount: Math.round(amount * 100),
      ref: reference,
      currency: "NGN",
      metadata: { order_id: order.id, order_type: orderType },
      callback: () => resolve({ status: "paid" }),
      onClose: () => resolve({ status: "closed" }),
    });
    handler.openIframe();
  });
}

/** Polls the profile until the webhook has applied the payment. */
export async function waitForProfile(
  userId: string,
  isDone: (p: { account_status: string | null; payment_status: string | null }) => boolean,
  timeoutMs = 60000,
): Promise<boolean> {
  const supabase = createClient();
  const started = Date.now();
  let delay = 2000;
  while (Date.now() - started < timeoutMs) {
    const { data } = await supabase.from("profiles").select("account_status, payment_status").eq("id", userId).maybeSingle();
    if (data && isDone(data)) return true;
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.5, 6000);
  }
  return false;
}

export async function recordTransfer(userId: string, amount: number): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("user_payments").insert({ user_id: userId, amount, status: "pending" });
  return !error;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
