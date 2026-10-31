"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSessionStore } from "@/store/sessionStore";
import { normalizeNgPhone } from "@/lib/utils/phone";
import { captureAttribution, track, type Attribution } from "@/lib/utils/attribution";
import type { SignupRole } from "@/lib/campaigns";
import { explainSignupError, validateAccount } from "@/lib/signupRules";
import s from "./campaign.module.css";

interface Props {
  slug: string;
  role: SignupRole;
  title: string;
  cta: string;
}

type Errors = Partial<Record<"fullName" | "phone" | "email" | "password" | "consent", string>>;
type Status = "idle" | "submitting" | "check_email";

const DRAFT_KEY = "s9_signup_draft";

/** Profile flags the signup trigger (`handle_new_user`) reads from user metadata. */
function roleFlags(role: SignupRole) {
  return {
    is_client: role === "client" || role === "company",
    is_artisan: role === "artisan",
    is_home_service_provider: role === "home_service_provider",
    is_company: role === "company",
  };
}

export function nextSignupUrl(slug: string, role: SignupRole): string {
  const params = new URLSearchParams({ resume: "true", step: "3", niche: slug });
  if (role === "home_service_provider") params.set("mode", "homeservice");
  return `/signup?${params.toString()}`;
}

export function validate(v: { fullName: string; phone: string; email: string; password: string; consent: boolean }): Errors {
  return validateAccount(v);
}

const explain = explainSignupError;

export function CampaignSignupForm({ slug, role, title, cta }: Props) {
  const router = useRouter();
  const { user } = useSessionStore();
  const uid = useId();
  const attribution = useRef<Attribution>({});
  const startedAt = useRef<number>(Date.now());
  const begun = useRef(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<{ text: string; login?: boolean } | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  // Restore a draft (never the password) and capture where the visitor came from.
  useEffect(() => {
    attribution.current = captureAttribution(window.location.search, window.location.pathname);
    try {
      const raw = window.sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as { fullName?: string; phone?: string; email?: string };
        if (d.fullName) setFullName(d.fullName);
        if (d.phone) setPhone(d.phone);
        if (d.email) setEmail(d.email);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ fullName, phone, email }));
    } catch {
      /* ignore */
    }
  }, [fullName, phone, email]);

  function onFirstInput() {
    if (begun.current) return;
    begun.current = true;
    track("begin_sign_up", { niche: slug, role });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;
    setFormError(null);

    // Bots fill hidden fields or submit within a second of the page loading.
    if (website || Date.now() - startedAt.current < 1500) {
      setFormError({ text: "Couldn't create your account. Try again in a moment." });
      return;
    }

    const found = validate({ fullName, phone, email, password, consent });
    setErrors(found);
    const firstBad = (["fullName", "phone", "email", "password", "consent"] as const).find((k) => found[k]);
    if (firstBad) {
      document.getElementById(`${uid}-${firstBad}`)?.focus();
      return;
    }

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setFormError({ text: "You're offline. Connect to the internet, then tap the button again." });
      return;
    }

    setStatus("submitting");
    const supabase = createClient();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim().replace(/\s+/g, " ");
    const e164 = normalizeNgPhone(phone)!;
    const next = nextSignupUrl(slug, role);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${next}`,
          data: {
            full_name: cleanName,
            phone_number: e164,
            ...roleFlags(role),
            signup_niche: slug,
            ...attribution.current,
            consent_terms_at: new Date().toISOString(),
          },
        },
      });

      if (error) {
        setFormError(explain(error.message));
        setStatus("idle");
        return;
      }

      // Supabase returns a user with no identities when the email is already
      // registered and email confirmation is on (it hides that on purpose).
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setFormError({ text: "This email already has an account.", login: true });
        setStatus("idle");
        return;
      }

      track("sign_up", { niche: slug, role, method: "email" });
      try {
        window.sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }

      if (!data.session) {
        // Email confirmation is switched on: the link in the email continues signup.
        setStatus("check_email");
        return;
      }

      const activeMode =
        role === "home_service_provider" ? "home_service_provider" : role === "artisan" ? "artisan" : role === "company" ? "company" : "client";
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ signup_step: 3, active_mode: activeMode }) // account_status is already "incomplete" from the signup trigger
        .eq("id", data.session.user.id);
      if (profileError) {
        // The account exists; the signup page resumes from the profile's saved step.
        console.warn("profile step not saved", profileError.message);
      }

      router.push(next);
    } catch (err) {
      setFormError(explain(err instanceof Error ? err.message : "network"));
      setStatus("idle");
    }
  }

  if (user) {
    return (
      <div className={s.formCard} id="join">
        <h2 className={s.formTitle}>You're signed in</h2>
        <p className={s.formSub}>Signed in as {user.full_name || user.email}.</p>
        <div className={s.fields}>
          <Link className={s.cta} href={user.account_status === "active" ? "/dashboard" : nextSignupUrl(slug, role)}>
            {user.account_status === "active" ? "Go to my dashboard" : "Finish my profile"}
          </Link>
        </div>
      </div>
    );
  }

  if (status === "check_email") {
    return (
      <div className={s.formCard} id="join" role="status" aria-live="polite">
        <div className={s.done}>
          <h3>Check your email</h3>
          <p>
            We sent a link to <strong>{email.trim().toLowerCase()}</strong>. Tap it to confirm your email and finish
            your profile. It can take a minute to arrive; check your spam folder too.
          </p>
        </div>
      </div>
    );
  }

  const field = (k: keyof Errors) => ({
    id: `${uid}-${k}`,
    "aria-invalid": errors[k] ? (true as const) : undefined,
    "aria-describedby": errors[k] ? `${uid}-${k}-err` : undefined,
  });
  const err = (k: keyof Errors) =>
    errors[k] ? (
      <p className={s.fieldError} id={`${uid}-${k}-err`}>
        {errors[k]}
      </p>
    ) : null;

  return (
    <form className={s.formCard} id="join" onSubmit={onSubmit} noValidate aria-labelledby={`${uid}-title`}>
      <h2 className={s.formTitle} id={`${uid}-title`}>
        {title}
      </h2>
      <p className={s.formSub}>Free. Takes about a minute.</p>

      <div className={s.fields} onInput={onFirstInput}>
        <div className={s.field}>
          <label htmlFor={`${uid}-fullName`}>Full name</label>
          <input
            {...field("fullName")}
            name="name"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={80}
          />
          {err("fullName")}
        </div>

        <div className={s.field}>
          <label htmlFor={`${uid}-phone`}>Phone number</label>
          <div className={s.phoneRow}>
            <span className={s.phonePrefix} aria-hidden="true">
              +234
            </span>
            <input
              {...field("phone")}
              name="tel"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="803 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={20}
            />
          </div>
          {err("phone") ?? <p className={s.hint}>Clients and employers use this to reach you.</p>}
        </div>

        <div className={s.field}>
          <label htmlFor={`${uid}-email`}>Email</label>
          <input
            {...field("email")}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={120}
          />
          {err("email")}
        </div>

        <div className={s.field}>
          <label htmlFor={`${uid}-password`}>Create a password</label>
          <div className={s.passwordRow}>
            <input
              {...field("password")}
              name="new-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={72}
            />
            <button
              type="button"
              className={s.reveal}
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
              aria-controls={`${uid}-password`}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {err("password") ?? <p className={s.hint}>At least 8 characters, with a letter and a number.</p>}
        </div>

        <div className={s.honeypot} aria-hidden="true">
          <label htmlFor={`${uid}-website`}>Website</label>
          <input
            id={`${uid}-website`}
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        <div>
          <label className={s.consent} htmlFor={`${uid}-consent`}>
            <input
              id={`${uid}-consent`}
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              aria-invalid={errors.consent ? true : undefined}
              aria-describedby={errors.consent ? `${uid}-consent-err` : undefined}
            />
            <span>
              I agree to the <Link href="/terms">Terms</Link> and how my data is used in the{" "}
              <Link href="/privacy">Privacy notice</Link>.
            </span>
          </label>
          {err("consent")}
        </div>

        {formError && (
          <p className={s.alert} role="alert">
            {formError.text}{" "}
            {formError.login && <Link href={`/login?next=${encodeURIComponent(`/${slug}`)}`}>Log in instead</Link>}
          </p>
        )}

        <button type="submit" className={s.cta} disabled={status === "submitting"} aria-busy={status === "submitting"}>
          {status === "submitting" ? "Creating your account…" : cta}
        </button>

        <p className={s.small}>
          Already on Skilled9ja? <Link href="/login">Log in</Link>
        </p>
      </div>
    </form>
  );
}
