"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useSessionStore } from "@/store/sessionStore";
import { FlowShell } from "@/components/signup/FlowShell";
import { PaymentPanel } from "./PaymentPanel";
import {
  homeServiceTotal,
  loadBankDetails,
  loadPricing,
  naira,
  recordTransfer,
  startPaystackCheckout,
  waitForProfile,
  type BankDetails,
  type OrderType,
  type Pricing,
} from "@/lib/payments";
import s from "@/components/signup/flow.module.css";

type Plan = "growth" | "business" | "unlimited";
type View = "choose" | "pay" | "transfer_sent" | "done";

const BENEFITS = ["Your work posts are visible to everyone, not only you", "Shown above free profiles near you"];

export function UpgradeClient() {
  const { user, isLoading, refreshUser } = useSessionStore();
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [bank, setBank] = useState<BankDetails | null>(null);
  const [services, setServices] = useState(0);
  const [pendingTransfer, setPendingTransfer] = useState(false);
  const [plan, setPlan] = useState<Plan>("growth");
  const [view, setView] = useState<View>("choose");
  const [method, setMethod] = useState<"paystack" | "manual">("paystack");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHs = user?.active_mode === "home_service_provider";
  const isProvider = user?.active_mode === "artisan" || isHs;
  const alreadyPaid = user?.payment_status === "verified" && (!isHs || (user.subscription_expires_at ? new Date(user.subscription_expires_at) > new Date() : false));

  useEffect(() => {
    loadPricing().then(setPricing);
    loadBankDetails().then(setBank);
  }, []);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase.from("provider_service_options").select("id", { count: "exact", head: true }).eq("provider_id", user.id).then(({ count }) => setServices(count ?? 0));
    supabase
      .from("user_payments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "pending")
      .then(({ count }) => setPendingTransfer((count ?? 0) > 0));
  }, [user]);

  if (isLoading || !pricing) return <FlowShell right={null}><p className={s.loading} role="status">Loading…</p></FlowShell>;
  if (!user) return null; // middleware sends logged-out visitors to log in

  const total = isHs ? homeServiceTotal(pricing, services, plan) : pricing.artisanPrice;
  const back = { href: "/dashboard", label: "Back to dashboard" };

  if (!isProvider) {
    return (
      <FlowShell right={back}>
        <section className={s.card}>
          <h1 className={s.title}>Nothing to pay</h1>
          <p className={s.sub}>
            {user.active_mode === "company" ? "Posting jobs is free right now." : "Clients never pay to search for or contact pros."}
          </p>
          <div className={s.actions}>
            <Link href={user.active_mode === "company" ? "/jobs/post" : "/find"} className={s.primary}>
              {user.active_mode === "company" ? "Post a job" : "Find a pro near me"}
            </Link>
          </div>
        </section>
      </FlowShell>
    );
  }

  if (alreadyPaid || view === "done") {
    return (
      <FlowShell right={back}>
        <section className={s.card} role="status">
          <h1 className={s.title}>Your profile is upgraded</h1>
          <p className={s.sub}>
            {isHs && user.subscription_expires_at
              ? `Your plan runs until ${new Date(user.subscription_expires_at).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}.`
              : "Your paid profile is active."}
          </p>
          <ul className={`${s.benefits} ${s.stack}`}>
            {BENEFITS.map((b) => <li key={b}>{b}</li>)}
          </ul>
          <div className={s.actions}>
            <Link href="/profile?tab=posts" className={s.primary}>Add photos of your work</Link>
          </div>
        </section>
      </FlowShell>
    );
  }

  if (view === "transfer_sent" || pendingTransfer) {
    return (
      <FlowShell right={back}>
        <section className={s.card} role="status">
          <h1 className={s.title}>We're checking your transfer</h1>
          <p className={s.sub}>We match transfers by hand, usually within one working day. Your profile stays live meanwhile, and the upgrade switches on when it's confirmed.</p>
          <div className={s.actions}>
            <Link href="/dashboard" className={s.primary}>Back to dashboard</Link>
          </div>
        </section>
      </FlowShell>
    );
  }

  async function payByCard() {
    if (!user || !pricing) return;
    setBusy(true);
    setError(null);
    const orderType: OrderType = isHs ? (`home_${plan}` as OrderType) : "artisan_subscription";
    const result = await startPaystackCheckout({ userId: user.id, email: user.email, amount: total, orderType, pricing });
    setBusy(false);
    if (result.status === "error") return setError(result.message);
    if (result.status === "closed") return setError("Payment window closed. Nothing was charged.");
    setConfirming(true);
    const ok = await waitForProfile(user.id, (p) => p.payment_status === "verified", 60000);
    setConfirming(false);
    await refreshUser();
    if (ok) setView("done");
    else setError("Paystack has your payment, but it hasn't reached your account yet. Refresh this page in a few minutes.");
  }

  async function transferSent() {
    if (!user) return;
    setBusy(true);
    const ok = await recordTransfer(user.id, total);
    setBusy(false);
    if (!ok) return setError("Couldn't record your transfer. Try again.");
    setView("transfer_sent");
  }

  if (view === "choose" && isHs) {
    return (
      <FlowShell right={back}>
        <section className={s.card} aria-labelledby="up-title">
          <h1 className={s.title} id="up-title">Upgrade your home-service profile</h1>
          <p className={s.sub}>Priced by the {services || 1} service{services === 1 ? "" : "s"} you offer.</p>
          <ul className={`${s.benefits} ${s.stack}`}>
            {BENEFITS.map((b) => <li key={b}>{b}</li>)}
          </ul>
          <div className={`${s.choices} ${s.stack}`} role="radiogroup" aria-labelledby="up-title">
            {(["growth", "business", "unlimited"] as Plan[]).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={plan === k} className={s.choice} onClick={() => setPlan(k)}>
                <span className={s.radio} aria-hidden="true" />
                <span>
                  <span className={s.choiceTitle}>
                    {k === "growth" ? "Growth" : k === "business" ? "Business" : "Unlimited"}{" "}
                    <span className={s.price}>{naira(homeServiceTotal(pricing, services, k))}{k === "unlimited" ? "/year" : "/month"}</span>
                  </span>
                  <span className={s.choiceBody}>{k === "growth" ? "For one person working alone." : k === "business" ? "For a small team. Staff tools are being built." : "Billed yearly, for larger teams."}</span>
                </span>
              </button>
            ))}
          </div>
          <div className={s.actions}>
            <button type="button" className={s.primary} onClick={() => setView("pay")}>Continue to payment</button>
          </div>
        </section>
      </FlowShell>
    );
  }

  return (
    <FlowShell right={back}>
      <PaymentPanel
        title={isHs ? "Pay for your plan" : "Get a paid profile"}
        lines={
          isHs
            ? [
                { label: `${Math.max(services, 1)} service${services === 1 ? "" : "s"} × ${naira(pricing.hsPerService)}`, amount: Math.max(services, 1) * pricing.hsPerService },
                ...(plan === "business" ? [{ label: "Business plan", amount: pricing.hsBusiness }] : []),
                ...(plan === "unlimited" ? [{ label: "Unlimited plan", amount: pricing.hsUnlimited }] : []),
              ]
            : [{ label: "Paid profile", amount: pricing.artisanPrice }]
        }
        total={total}
        period={isHs ? (plan === "unlimited" ? "year" : "month") : "once"}
        benefits={isHs ? [] : BENEFITS}
        pricing={pricing}
        bank={bank}
        userId={user.id}
        method={method}
        setMethod={setMethod}
        onPaystack={payByCard}
        onTransferSent={transferSent}
        busy={busy}
        confirming={confirming}
        error={error}
        onBack={isHs ? () => setView("choose") : undefined}
      />
    </FlowShell>
  );
}
