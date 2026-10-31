"use client";

import { useId, useState } from "react";
import s from "./campaign.module.css";

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

/** Parses "150,000" or "₦1,500" into a number; empty or junk becomes 0. */
function toNumber(v: string): number {
  const n = Number(v.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export interface CommuteInput {
  salary: number;
  fare: number; // one way
  nearFare: number; // one way, to a job close to home
  days: number;
  minutes: number; // one way
}

export function commuteCost({ salary, fare, nearFare, days, minutes }: CommuteInput) {
  const monthly = fare * 2 * days;
  const nearMonthly = nearFare * 2 * days;
  const share = salary > 0 ? Math.min(monthly / salary, 1) : 0;
  const hours = (minutes * 2 * days) / 60;
  return {
    monthly,
    yearly: monthly * 12,
    share,
    hours,
    keep: Math.max(salary - monthly, 0),
    saving: Math.max(monthly - nearMonthly, 0),
  };
}

export function CommuteCalculator() {
  const id = useId();
  const [salary, setSalary] = useState("150,000");
  const [fare, setFare] = useState("1,500");
  const [nearFare, setNearFare] = useState("300");
  const [days, setDays] = useState("22");
  const [minutes, setMinutes] = useState("90");

  const r = commuteCost({
    salary: toNumber(salary),
    fare: toNumber(fare),
    nearFare: toNumber(nearFare),
    days: Math.min(toNumber(days), 31),
    minutes: Math.min(toNumber(minutes), 600),
  });
  const pct = Math.round(r.share * 100);
  const salaryKnown = toNumber(salary) > 0;

  const input = (
    key: string,
    label: string,
    value: string,
    set: (v: string) => void,
    hint?: string,
    prefix = true,
  ) => (
    <div className={s.field}>
      <label htmlFor={`${id}-${key}`}>{label}</label>
      <input
        id={`${id}-${key}`}
        inputMode="numeric"
        value={value}
        onChange={(e) => set(e.target.value)}
        onBlur={() => {
          const n = toNumber(value);
          set(n ? n.toLocaleString("en-NG") : "");
        }}
        aria-describedby={hint ? `${id}-${key}-hint` : undefined}
        placeholder={prefix ? "₦" : undefined}
      />
      {hint && (
        <p className={s.hint} id={`${id}-${key}-hint`}>
          {hint}
        </p>
      )}
    </div>
  );

  return (
    <div className={s.calc}>
      <div className={s.calcInputs}>
        {input("salary", "Monthly salary (₦)", salary, setSalary)}
        {input("fare", "Transport to work, one way (₦)", fare, setFare, "All the buses, kekes or bikes for one trip.")}
        {input("minutes", "Travel time, one way (minutes)", minutes, setMinutes, undefined, false)}
        {input("days", "Work days a month", days, setDays, undefined, false)}
        {input("near", "Transport to a job near home, one way (₦)", nearFare, setNearFare, "For a job you could reach with one short ride.")}
      </div>

      <div className={s.calcResult} aria-live="polite">
        <p className={s.calcBig}>{naira(r.monthly)}</p>
        <p className={s.calcLabel}>
          goes on transport every month
          {salaryKnown ? `, ${pct}% of your salary` : ""}.
        </p>

        {salaryKnown && (
          <div
            className={s.salaryBar}
            role="img"
            aria-label={`Of ${naira(toNumber(salary))}, you keep ${naira(r.keep)} and ${naira(r.monthly)} goes on transport.`}
          >
            <div className={s.salaryKeep} style={{ width: `${100 - pct}%` }}>
              {pct < 85 ? `You keep ${naira(r.keep)}` : ""}
            </div>
            <div className={s.salaryLost} style={{ width: `${pct}%` }}>
              {pct >= 15 ? `${pct}% transport` : ""}
            </div>
          </div>
        )}

        <div className={s.calcRows}>
          <div className={s.calcRow}>
            <span>Transport in a year</span>
            <b>{naira(r.yearly)}</b>
          </div>
          <div className={s.calcRow}>
            <span>Hours in traffic a month</span>
            <b>{Math.round(r.hours)} hours</b>
          </div>
        </div>

        {r.saving > 0 && (
          <p className={s.calcSave}>
            A job near home keeps <strong>{naira(r.saving)}</strong> more in your pocket every month.
          </p>
        )}
      </div>
    </div>
  );
}
