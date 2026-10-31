"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SignupState } from "@/lib/hooks/useSignup";
import s from "../flow.module.css";

const HEADINGS: Record<string, string> = {
  work: "Create your free profile",
  home_service: "Create your home-service profile",
  hire_pro: "Create your free account",
  hire_staff: "Create your company account",
};

export function BasicStep({ s: f }: { s: SignupState }) {
  const [show, setShow] = useState(false);
  const e = f.accountErrors;
  // Move the cursor to the first field that needs fixing.
  useEffect(() => {
    const first = (["fullName", "phone", "email", "password", "consent"] as const).find((k) => e[k]);
    if (first) document.getElementById(`acc-${first}`)?.focus();
  }, [e]);
  const field = (k: keyof typeof e) => ({
    id: `acc-${k}`,
    "aria-invalid": e[k] ? (true as const) : undefined,
    "aria-describedby": e[k] ? `acc-${k}-err` : undefined,
  });
  const err = (k: keyof typeof e) => (e[k] ? <p className={s.err} id={`acc-${k}-err`}>{e[k]}</p> : null);

  return (
    <form className={s.card} onSubmit={f.handleBasicSubmit} noValidate aria-labelledby="acc-title">
      <h1 className={s.title} id="acc-title">
        {HEADINGS[f.path ?? "work"]}
      </h1>
      <p className={s.sub}>Free. You can finish the rest of your profile in the next step.</p>

      <div className={s.stack}>
        <div className={s.field}>
          <label htmlFor="acc-fullName">{f.isCompany ? "Your full name" : "Full name"}</label>
          <input {...field("fullName")} autoComplete="name" value={f.fullName} onChange={(ev) => f.setFullName(ev.target.value)} maxLength={80} />
          {err("fullName") ?? (f.isCompany ? <p className={s.hint}>You'll add the company name next.</p> : null)}
        </div>

        <div className={s.field}>
          <label htmlFor="acc-phone">Phone number</label>
          <div className={s.phoneRow}>
            <span className={s.phonePrefix} aria-hidden="true">+234</span>
            <input {...field("phone")} type="tel" inputMode="tel" autoComplete="tel-national" placeholder="803 123 4567" value={f.phone} onChange={(ev) => f.setPhone(ev.target.value)} maxLength={20} />
          </div>
          {err("phone")}
        </div>

        <div className={s.field}>
          <label htmlFor="acc-email">Email</label>
          <input {...field("email")} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={f.email} onChange={(ev) => f.setEmail(ev.target.value)} maxLength={120} />
          {err("email")}
        </div>

        <div className={s.field}>
          <label htmlFor="acc-password">Create a password</label>
          <div className={s.pwRow}>
            <input {...field("password")} type={show ? "text" : "password"} autoComplete="new-password" value={f.password} onChange={(ev) => f.setPassword(ev.target.value)} maxLength={72} />
            <button type="button" className={s.reveal} onClick={() => setShow((v) => !v)} aria-pressed={show} aria-controls="acc-password">
              {show ? "Hide" : "Show"}
            </button>
          </div>
          {err("password") ?? <p className={s.hint}>At least 8 characters, with a letter and a number.</p>}
        </div>

        <div>
          <label className={s.consent} htmlFor="acc-consent">
            <input id="acc-consent" type="checkbox" checked={f.consent} onChange={(ev) => f.setConsent(ev.target.checked)} aria-invalid={e.consent ? true : undefined} aria-describedby={e.consent ? "acc-consent-err" : undefined} />
            <span>
              I agree to the <Link href="/terms">Terms</Link> and how my data is used in the <Link href="/privacy">Privacy notice</Link>.
            </span>
          </label>
          {err("consent")}
        </div>

        {f.formError && (
          <p className={s.alert} role="alert">
            {f.formError.text} {f.formError.login && <Link href="/login">Log in instead</Link>}
          </p>
        )}
      </div>

      <div className={s.actions}>
        {f.canGoBack && (
          <button type="button" className={s.secondary} onClick={f.goBack}>
            Back
          </button>
        )}
        <button type="submit" className={s.primary} disabled={f.isLoading} aria-busy={f.isLoading}>
          {f.isLoading ? "Creating your account…" : "Create account"}
        </button>
      </div>
      <p className={s.small}>
        Already on Skilled9ja? <Link href="/login">Log in</Link>
      </p>
    </form>
  );
}
