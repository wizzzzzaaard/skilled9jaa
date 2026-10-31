"use client";

import type { SignupState } from "@/lib/hooks/useSignup";
import type { SignupPath } from "@/types/signup";
import s from "../flow.module.css";

const OPTIONS: { key: SignupPath; title: string; body: string }[] = [
  { key: "work", title: "Find work or clients", body: "Artisans, professionals and job seekers. Get found by people and companies near you." },
  { key: "home_service", title: "Offer home service", body: "Makeup, hair, photography and more, at clients' homes or events." },
  { key: "hire_pro", title: "Hire a pro", body: "Find a plumber, tailor, makeup artist or other pro close to you." },
  { key: "hire_staff", title: "Hire staff for my company", body: "Post jobs and reach candidates who live near your workplace." },
];

export function RoleStep({ s: f }: { s: SignupState }) {
  function onKey(e: React.KeyboardEvent<HTMLDivElement>) {
    // Arrow keys move between options, like a native radio group.
    if (!["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(e.key)) return;
    e.preventDefault();
    const i = Math.max(0, OPTIONS.findIndex((o) => o.key === f.path));
    const next = OPTIONS[(i + (e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : OPTIONS.length - 1)) % OPTIONS.length];
    f.choosePath(next.key);
    document.getElementById(`path-${next.key}`)?.focus();
  }

  return (
    <section className={s.card} aria-labelledby="role-title">
      <h1 className={s.title} id="role-title">
        What do you want to do?
      </h1>
      <p className={s.sub}>Joining is free. You can add another kind of profile later.</p>

      <div className={`${s.choices} ${s.stack}`} role="radiogroup" aria-labelledby="role-title" onKeyDown={onKey}>
        {OPTIONS.map((o) => {
          const on = f.path === o.key;
          return (
            <button
              key={o.key}
              id={`path-${o.key}`}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on || (!f.path && o.key === "work") ? 0 : -1}
              className={s.choice}
              onClick={() => f.choosePath(o.key)}
            >
              <span className={s.radio} aria-hidden="true" />
              <span>
                <span className={s.choiceTitle}>{o.title}</span>
                <span className={s.choiceBody}>{o.body}</span>
              </span>
            </button>
          );
        })}
      </div>

      {f.formError && (
        <p className={`${s.alert} ${s.stack}`} role="alert">
          {f.formError.text}
        </p>
      )}

      <div className={s.actions}>
        <button type="button" className={s.primary} onClick={f.handleRoleSubmit}>
          Continue
        </button>
      </div>
      <p className={s.small}>
        Already on Skilled9ja? <a href="/login">Log in</a>
      </p>
    </section>
  );
}
