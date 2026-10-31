"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "@fontsource-variable/bricolage-grotesque/wdth.css";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import { createClient } from "@/lib/supabase/client";
import { FlowShell } from "@/components/signup/FlowShell";
import { FREE_SIGNUP } from "@/lib/config";
import { naira, transferReference } from "@/lib/payments";
import s from "@/components/signup/flow.module.css";

type Payment = { amount: number; status: string; created_at: string } | null;

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default function PendingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [payment, setPayment] = useState<Payment>(null);
  const [paidByCard, setPaidByCard] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const stopped = useRef(false);

  useEffect(() => {
    setPaidByCard(new URLSearchParams(window.location.search).get("paid") === "card");
    const supabase = createClient();
    let timer: number | undefined;
    let delay = 4000;
    const started = Date.now();

    async function check(first = false) {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push("/login?next=/signup/pending");
        return;
      }
      if (first) {
        setEmail(auth.user.email || "");
        setUserId(auth.user.id);
        const { data: pay } = await supabase
          .from("user_payments")
          .select("amount, status, created_at")
          .eq("user_id", auth.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setPayment((pay as Payment) ?? null);
      }
      const { data: profile } = await supabase.from("profiles").select("account_status").eq("id", auth.user.id).maybeSingle();
      setCheckedAt(new Date());
      const st = profile?.account_status ?? null;
      if (st === "active") {
        router.push("/dashboard?welcome=1");
        return;
      }
      // With free signup nobody waits at the door: let them in now; the transfer
      // still gets checked and turns on the paid profile when confirmed.
      if (FREE_SIGNUP && st === "pending_manual" && first) {
        const { error } = await supabase.rpc("complete_signup");
        if (!error || error.code === "PGRST202") {
          if (error) await supabase.from("profiles").update({ account_status: "active", signup_step: 6 }).eq("id", auth.user.id);
          router.push("/dashboard?welcome=1");
          return;
        }
      }
      setStatus(st);
    }

    function loop() {
      if (stopped.current) return;
      // Check less often over time, pause in a background tab, give up after 15 minutes.
      if (Date.now() - started > 15 * 60_000) return;
      timer = window.setTimeout(async () => {
        if (document.visibilityState === "visible") await check();
        delay = Math.min(delay * 1.4, 30000);
        loop();
      }, delay);
    }

    check(true).then(loop);
    return () => {
      stopped.current = true;
      window.clearTimeout(timer);
    };
  }, [router]);

  async function logout() {
    await createClient().auth.signOut();
    router.push("/");
  }

  const manual = status === "pending_manual" || (!!payment && !paidByCard);
  const verifying = status === "pending_verify";

  return (
    <FlowShell right={null}>
      <section className={s.card} aria-labelledby="pending-title">
        {status === null && !payment ? (
          <p className={s.loading} role="status">Checking your account…</p>
        ) : (
          <>
            <h1 className={s.title} id="pending-title">
              {paidByCard ? "Confirming your card payment" : verifying ? "Checking your identity" : "We're checking your transfer"}
            </h1>
            <p className={s.sub}>
              {paidByCard
                ? "Paystack has your payment. It usually takes a minute to reach your account."
                : verifying
                ? "Our team is reviewing your NIN and photo. This usually takes one working day."
                : "We match transfers by hand, usually within one working day."}{" "}
              You'll get an email at {email || "your address"} when it's done. This page also updates by itself.
            </p>

            <ol className={`${s.timeline} ${s.stack}`} aria-label="Progress">
              <li className={s.done}>
                <b>{paidByCard ? "Paid with Paystack" : verifying ? "Details submitted" : "Transfer recorded"}</b>
                {payment && <span>{naira(Number(payment.amount))} on {when(payment.created_at)}</span>}
              </li>
              <li className={s.now}>
                <b>{paidByCard ? "Confirming with your account" : verifying ? "Under review" : "Checking with the bank"}</b>
                <span>{checkedAt ? `Last checked at ${checkedAt.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" })}` : "Checking…"}</span>
              </li>
              <li>
                <b>Account active</b>
                <span>We'll take you to your dashboard</span>
              </li>
            </ol>

            {manual && userId && (
              <p className={s.note}>
                Did you put <b>{transferReference(userId)}</b> in the transfer description? If not, it can take longer to match. Keep your bank receipt.
              </p>
            )}
            {paidByCard && (
              <p className={s.note}>
                Not active after 30 minutes? Contact support with the email Paystack sent you. You won't be charged twice.
              </p>
            )}
          </>
        )}
        <div className={s.actions}>
          <Link href="/" className={s.secondary}>
            Home
          </Link>
          <button type="button" className={s.secondary} onClick={logout}>
            Log out
          </button>
        </div>
      </section>
    </FlowShell>
  );
}
