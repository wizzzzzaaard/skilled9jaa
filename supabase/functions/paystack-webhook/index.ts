// Paystack webhook (proposed v5). Not deployed: review, then deploy with
//   supabase functions deploy paystack-webhook --no-verify-jwt
// Changes from the live v4:
//   1. Finds the order whether the reference is "<timestamp>-<orderId>" or the bare
//      order id. v4 cut a bare UUID at its first dash, so no order was ever found.
//   2. Refuses to activate anything unless the amount and currency match the order.
//   3. Uses a constant-time signature comparison.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as crypto from "node:crypto";

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function orderIdFrom(reference: string): string | null {
  const match = reference.match(UUID);
  return match ? match[0].toLowerCase() : null;
}

function safeEqual(a: string, b: string): boolean {
  const ab = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

const addMonths = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d.toISOString();
};

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const signature = req.headers.get("x-paystack-signature");
  if (!signature) return new Response("Missing signature", { status: 401 });

  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secret) {
    console.error("PAYSTACK_SECRET_KEY env var not set");
    return new Response("Server misconfiguration", { status: 500 });
  }

  const bodyText = await req.text();
  const hash = crypto.createHmac("sha512", secret).update(bodyText).digest("hex");
  if (!safeEqual(hash, signature)) return new Response("Invalid signature", { status: 401 });

  const payload = JSON.parse(bodyText);
  if (payload.event !== "charge.success") return new Response("Event acknowledged", { status: 200 });

  const reference = String(payload.data?.reference ?? "");
  const orderId = orderIdFrom(reference);
  if (!orderId) {
    console.error("Reference without an order id:", reference);
    return new Response("Unknown reference", { status: 200 });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: order, error: orderFetchError } = await supabase
    .from("orders")
    .select("id, user_id, order_type, amount, status")
    .eq("id", orderId)
    .maybeSingle();

  if (orderFetchError || !order) {
    console.error("Order not found:", orderId, orderFetchError);
    return new Response("Order not found", { status: 200 });
  }
  if (order.status === "verified") return new Response("Already processed", { status: 200 });

  // Amount is in kobo. Never trust the browser's order amount without this check.
  const paidNaira = Number(payload.data?.amount ?? 0) / 100;
  const currency = String(payload.data?.currency ?? "");
  if (currency !== "NGN" || paidNaira + 0.001 < Number(order.amount)) {
    console.error("Amount mismatch", { orderId, paidNaira, expected: order.amount, currency });
    await supabase.from("orders").update({ status: "amount_mismatch", payment_reference: reference }).eq("id", orderId);
    return new Response("Amount mismatch", { status: 200 });
  }

  const now = new Date().toISOString();
  const { error: orderUpdateError } = await supabase
    .from("orders")
    .update({ status: "verified", payment_method: "paystack", transaction_ref: reference, payment_reference: reference, approved_at: now })
    .eq("id", orderId)
    .neq("status", "verified");
  if (orderUpdateError) {
    console.error("Failed to update order:", orderUpdateError);
    return new Response("DB error", { status: 500 });
  }

  const profileUpdates: Record<string, unknown> = { payment_status: "verified", account_status: "active", signup_step: 6 };
  let tier: string | null = null;
  let expiresAt: string | null = null;

  switch (order.order_type) {
    case "artisan_subscription": {
      const { data: settings } = await supabase
        .from("platform_settings")
        .select("artisan_pricing_mode")
        .eq("id", 1)
        .maybeSingle();
      profileUpdates.is_artisan = true;
      profileUpdates.artisan_paid_at = now;
      if (settings?.artisan_pricing_mode === "monthly") {
        profileUpdates.artisan_payment_type = "monthly";
        profileUpdates.artisan_expires_at = addMonths(1);
      } else {
        profileUpdates.artisan_payment_type = "lifetime";
        profileUpdates.artisan_expires_at = null;
      }
      break;
    }
    case "home_growth":
    case "home_business":
      tier = order.order_type === "home_growth" ? "growth" : "business";
      expiresAt = addMonths(1);
      profileUpdates.is_home_service_provider = true;
      profileUpdates.subscription_expires_at = expiresAt;
      break;
    case "home_unlimited":
      tier = "unlimited";
      expiresAt = addMonths(12);
      profileUpdates.is_home_service_provider = true;
      profileUpdates.subscription_expires_at = expiresAt;
      break;
    case "company_subscription":
      profileUpdates.is_company = true;
      break;
    default:
      console.warn("Unknown order_type:", order.order_type, "order:", orderId);
      delete profileUpdates.account_status;
  }

  const { error: profileError } = await supabase.from("profiles").update(profileUpdates).eq("id", order.user_id);
  if (profileError) {
    console.error("Failed to update profile:", profileError);
    return new Response("Profile update failed", { status: 500 });
  }

  if (tier) {
    const { error: subError } = await supabase.from("user_subscriptions").insert({
      user_id: order.user_id,
      plan_type: order.order_type,
      tier,
      amount_paid: order.amount,
      payment_method: "paystack",
      payment_ref: reference,
      order_id: orderId,
      status: "active",
      starts_at: now,
      expires_at: expiresAt,
    });
    if (subError) console.error("Failed to create subscription record:", subError);
  }

  console.log(`Paystack payment processed: order=${orderId} user=${order.user_id} type=${order.order_type}`);
  return new Response("OK", { status: 200 });
});
