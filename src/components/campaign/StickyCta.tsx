"use client";

import { useEffect, useState } from "react";
import s from "./campaign.module.css";

/** Mobile-only button that appears once the signup form scrolls out of view. */
export function StickyCta({ label }: { label: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const form = document.getElementById("join");
    if (!form || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    io.observe(form);
    return () => io.disconnect();
  }, []);

  return (
    <div className={`${s.sticky} ${show ? s.stickyOn : ""}`} aria-hidden={!show}>
      <a href="#join" className={s.cta} tabIndex={show ? 0 : -1} onClick={focusForm}>
        {label}
      </a>
    </div>
  );
}

/** In-page button that jumps to the signup form and puts the cursor in it. */
export function JoinLink({ label, className }: { label: string; className?: string }) {
  return (
    <a href="#join" className={className ?? s.cta} onClick={focusForm}>
      {label}
    </a>
  );
}

export function focusForm() {
  window.setTimeout(() => {
    const first = document.querySelector<HTMLInputElement>("#join input:not([tabindex='-1'])");
    first?.focus({ preventScroll: true });
  }, 400);
}
