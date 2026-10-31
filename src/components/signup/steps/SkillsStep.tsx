"use client";

import { useMemo, useState } from "react";
import type { SignupState } from "@/lib/hooks/useSignup";
import s from "../flow.module.css";

type Filter = "ALL" | "SKILL" | "JOB";

export function SkillsStep({ s: f }: { s: SignupState }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");

  const chosen = useMemo(() => f.availableSkills.filter((sk) => f.selectedSkillIds.includes(sk.id)), [f.availableSkills, f.selectedSkillIds]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return f.availableSkills
      .filter((sk) => (filter === "ALL" || sk.type === filter) && (!q || sk.name.toLowerCase().includes(q)) && !f.selectedSkillIds.includes(sk.id))
      .slice(0, q ? 60 : 40);
  }, [f.availableSkills, f.selectedSkillIds, query, filter]);

  return (
    <section className={s.card} aria-labelledby="skills-title">
      <h1 className={s.title} id="skills-title">
        What do you do?
      </h1>
      <p className={s.sub}>Pick up to 3. Trade skills help clients find you; job roles help employers find you.</p>

      <div className={s.stack}>
        <div aria-live="polite">
          <p className={s.counter}>
            <b>{f.selectedSkillIds.length}</b> of 3 chosen
          </p>
          {chosen.length > 0 && (
            <ul className={s.chips} style={{ marginTop: "0.5rem" }} aria-label="Chosen">
              {chosen.map((sk) => (
                <li key={sk.id}>
                  <button type="button" className={s.chip} aria-pressed="true" onClick={() => f.toggleSkill(sk.id)} aria-label={`Remove ${sk.name}`}>
                    {sk.name} <span aria-hidden="true">✕</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={s.field}>
          <label htmlFor="skill-search">Search</label>
          <input id="skill-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Plumbing, cashier, web design…" autoComplete="off" />
        </div>

        <div className={s.tabs} role="group" aria-label="Show">
          {(["ALL", "SKILL", "JOB"] as Filter[]).map((k) => (
            <button key={k} type="button" className={s.chip} aria-pressed={filter === k} onClick={() => setFilter(k)}>
              {k === "ALL" ? "All" : k === "SKILL" ? "Trade skills" : "Job roles"}
            </button>
          ))}
        </div>

        {f.skillsLoading ? (
          <p className={s.loading} role="status">Loading skills…</p>
        ) : shown.length === 0 ? (
          <p className={s.hint}>
            {query ? `Nothing matches "${query}". Try a shorter word.` : "No more skills in this group."}
          </p>
        ) : (
          <div className={s.list}>
            <ul className={s.chips}>
              {shown.map((sk) => (
                <li key={sk.id}>
                  <button type="button" className={s.chip} aria-pressed="false" onClick={() => f.toggleSkill(sk.id)} disabled={f.selectedSkillIds.length >= 3}>
                    {sk.name} <span className={s.chipType}>{sk.type === "JOB" ? "Job" : "Trade"}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
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
        <button type="button" className={s.primary} onClick={f.handleSkillsSubmit} disabled={f.isLoading} aria-busy={f.isLoading}>
          {f.isLoading ? "Saving…" : f.isPaidRole ? "Next: payment" : "Finish"}
        </button>
      </div>
    </section>
  );
}
