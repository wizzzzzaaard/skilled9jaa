"use client";

import type { SignupState } from "@/lib/hooks/useSignup";
import { homeServiceTotal, naira } from "@/lib/payments";
import s from "../flow.module.css";

const PLANS = [
  { key: "growth" as const, title: "Growth", body: "For one person working alone." },
  { key: "business" as const, title: "Business", body: "For a small team. Staff tools are being built." },
  { key: "unlimited" as const, title: "Unlimited", body: "Billed yearly. For larger teams." },
];

export function HsPlanStep({ s: f }: { s: SignupState }) {
  const p = f.pricing;
  const n = f.selectedHsCategoryIds.length;
  return (
    <section className={s.card} aria-labelledby="plan-title">
      <h1 className={s.title} id="plan-title">
        Choose a plan
      </h1>
      <p className={s.sub}>
        Every plan lists your {n} service{n === 1 ? "" : "s"} to clients nearby.
      </p>
      <div className={`${s.choices} ${s.stack}`} role="radiogroup" aria-labelledby="plan-title">
        {PLANS.map((pl) => {
          const on = f.hsPlan === pl.key;
          return (
            <button key={pl.key} type="button" role="radio" aria-checked={on} className={s.choice} onClick={() => f.setHsPlan(pl.key)}>
              <span className={s.radio} aria-hidden="true" />
              <span>
                <span className={s.choiceTitle}>
                  {pl.title} {p && <span className={s.price}>{naira(homeServiceTotal(p, n, pl.key))}{pl.key === "unlimited" ? "" : "/month"}</span>}
                </span>
                <span className={s.choiceBody}>{pl.body}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className={s.actions}>
        <button type="button" className={s.secondary} onClick={f.goBack}>
          Back
        </button>
        <button type="button" className={s.primary} onClick={f.handleHsPlanSubmit}>
          Next: payment
        </button>
      </div>
    </section>
  );
}
