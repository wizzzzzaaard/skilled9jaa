"use client";

import s from "../flow.module.css";

export function CheckEmailStep({ email }: { email: string }) {
  return (
    <section className={s.card} aria-labelledby="mail-title" role="status">
      <h1 className={s.title} id="mail-title">
        Check your email
      </h1>
      <p className={s.sub}>
        We sent a link to <b>{email.trim().toLowerCase()}</b>. Tap it to confirm your email and finish your profile.
      </p>
      <p className={`${s.note} ${s.stack}`}>It can take a minute to arrive. Check your spam or promotions folder too.</p>
    </section>
  );
}
