"use client";

import Link from "next/link";
import s from "../flow.module.css";

export function SuccessStep() {
  return (
    <section className={s.card} aria-labelledby="done-title" role="status">
      <h1 className={s.title} id="done-title">
        You're in
      </h1>
      <p className={s.sub}>Your payment is confirmed and your profile is live.</p>
      <div className={s.actions}>
        <Link href="/dashboard?welcome=1" className={s.primary}>
          Go to my dashboard
        </Link>
      </div>
    </section>
  );
}
