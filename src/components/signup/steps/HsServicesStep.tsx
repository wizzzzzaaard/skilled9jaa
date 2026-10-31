"use client";

import type { SignupState } from "@/lib/hooks/useSignup";
import s from "../flow.module.css";

export function HsServicesStep({ s: f }: { s: SignupState }) {
  const toggle = (id: string) =>
    f.setSelectedHsCategoryIds(f.selectedHsCategoryIds.includes(id) ? f.selectedHsCategoryIds.filter((x) => x !== id) : [...f.selectedHsCategoryIds, id]);

  return (
    <section className={s.card} aria-labelledby="hs-title">
      <h1 className={s.title} id="hs-title">
        Which services do you offer?
      </h1>
      <p className={s.sub}>Pick all that apply. You can set prices for each one from your dashboard.</p>

      <div className={s.stack}>
        <p className={s.counter} aria-live="polite">
          <b>{f.selectedHsCategoryIds.length}</b> chosen
        </p>
        {f.hsCategoriesLoading ? (
          <p className={s.loading} role="status">Loading services…</p>
        ) : (
          <ul className={s.chips}>
            {f.hsCategories.map((c) => {
              const on = f.selectedHsCategoryIds.includes(c.id);
              return (
                <li key={c.id}>
                  <button type="button" className={s.chip} aria-pressed={on} onClick={() => toggle(c.id)}>
                    {c.name}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {f.skillsError && (
          <p className={s.alert} role="alert">
            {f.skillsError}
          </p>
        )}
        {f.formError && (
          <p className={s.alert} role="alert">
            {f.formError.text}
          </p>
        )}
      </div>

      <div className={s.actions}>
        <button type="button" className={s.secondary} onClick={f.goBack}>
          Back
        </button>
        <button type="button" className={s.primary} onClick={f.handleHsServicesSubmit} disabled={f.isLoading} aria-busy={f.isLoading}>
          {f.isLoading ? "Saving…" : f.isPaidRole ? "Next: choose a plan" : "Finish"}
        </button>
      </div>
    </section>
  );
}
