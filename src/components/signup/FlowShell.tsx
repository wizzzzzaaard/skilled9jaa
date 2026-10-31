import Link from "next/link";
import s from "./flow.module.css";

interface Props {
  children: React.ReactNode;
  steps?: { key: string; label: string }[];
  stepIndex?: number;
  right?: { href: string; label: string } | null;
}

/** Page frame for signup, pending and upgrade screens: logo, progress, one column. */
export function FlowShell({ children, steps, stepIndex = 0, right = { href: "/login", label: "Log in" } }: Props) {
  const current = steps?.[stepIndex];
  return (
    <div className={s.root}>
      <header className={s.bar}>
        <Link href="/" className={s.logo} aria-label="Skilled9ja home">
          Skilled<span>9ja</span>
        </Link>
        {right && (
          <Link href={right.href} className={s.barLink}>
            {right.label}
          </Link>
        )}
      </header>
      <div className={s.wrap}>
        {steps && current && (
          <div className={s.progress}>
            <p className={s.progressText} aria-live="polite">
              Step <b>{stepIndex + 1}</b> of {steps.length}: {current.label}
            </p>
            <div className={s.segments} aria-hidden="true">
              {steps.map((st, i) => (
                <span key={st.key} className={i <= stepIndex ? s.on : undefined} />
              ))}
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
