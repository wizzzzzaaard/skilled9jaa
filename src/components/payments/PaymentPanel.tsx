"use client";

import { useState } from "react";
import { copyToClipboard, naira, transferReference, type BankDetails, type Pricing } from "@/lib/payments";
import s from "@/components/signup/flow.module.css";

interface Props {
  title: string;
  lines: { label: string; amount: number }[];
  total: number;
  /** "once" or "month" or "year" */
  period: string;
  benefits: string[];
  pricing: Pricing | null;
  bank: BankDetails | null;
  userId: string;
  method: "paystack" | "manual";
  setMethod: (m: "paystack" | "manual") => void;
  onPaystack: () => void;
  onTransferSent: () => void;
  busy: boolean;
  confirming: boolean;
  error: string | null;
  onBack?: () => void;
}

/** Order summary + card or bank transfer. Used in signup and on /upgrade. */
export function PaymentPanel(p: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const ref = transferReference(p.userId);
  const paystackOn = p.pricing?.paystackEnabled ?? true;
  const manualOn = (p.pricing?.manualEnabled ?? true) && !!p.bank;
  const method = paystackOn ? p.method : "manual";

  async function copy(key: string, text: string) {
    const ok = await copyToClipboard(text);
    setCopied(ok ? key : null);
    window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
  }

  const bankRow = (key: string, label: string, value: string, mono = false) => (
    <div className={s.bankRow}>
      <div>
        <span className={s.bankLabel}>{label}</span>
        <span className={`${s.bankValue} ${mono ? s.mono : ""}`}>{value}</span>
      </div>
      <button type="button" className={s.copy} onClick={() => copy(key, key === "amount" ? value.replace(/[^\d]/g, "") : value.trim())} aria-label={`Copy ${label}`}>
        {copied === key ? "Copied" : "Copy"}
      </button>
    </div>
  );

  return (
    <section className={s.card} aria-labelledby="pay-title">
      <h1 className={s.title} id="pay-title">
        {p.title}
      </h1>

      <div className={s.stack}>
        {p.benefits.length > 0 && (
          <ul className={s.benefits} aria-label="What you get">
            {p.benefits.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        )}

        <div className={s.summary} aria-label="Order summary">
          {p.lines.map((l) => (
            <div className={s.sumRow} key={l.label}>
              <span>{l.label}</span>
              <span>{naira(l.amount)}</span>
            </div>
          ))}
          <div className={`${s.sumRow} ${s.sumTotal}`}>
            <span>Total{p.period === "once" ? ", one time" : p.period === "month" ? " per month" : " per year"}</span>
            <b>{naira(p.total)}</b>
          </div>
        </div>

        {paystackOn && manualOn && (
          <div className={s.choices} role="radiogroup" aria-label="How do you want to pay?">
            <button type="button" role="radio" aria-checked={method === "paystack"} className={s.choice} onClick={() => p.setMethod("paystack")}>
              <span className={s.radio} aria-hidden="true" />
              <span>
                <span className={s.choiceTitle}>Card, bank app or USSD</span>
                <span className={s.choiceBody}>Paid through Paystack. Your account updates in a minute.</span>
              </span>
            </button>
            <button type="button" role="radio" aria-checked={method === "manual"} className={s.choice} onClick={() => p.setMethod("manual")}>
              <span className={s.radio} aria-hidden="true" />
              <span>
                <span className={s.choiceTitle}>Bank transfer</span>
                <span className={s.choiceBody}>We confirm it by hand, usually within one working day.</span>
              </span>
            </button>
          </div>
        )}

        {method === "manual" && p.bank && (
          <>
            <div className={s.bank}>
              {bankRow("amount", "Amount", naira(p.total))}
              {bankRow("acct", "Account number", p.bank.account_number, true)}
              {bankRow("bank", "Bank", p.bank.bank_name)}
              {bankRow("name", "Account name", p.bank.account_name)}
              {bankRow("ref", "Narration / description", ref, true)}
            </div>
            <p className={s.note}>
              Put <b>{ref}</b> in the transfer description so we can match it to you. Send the exact amount.
            </p>
          </>
        )}

        {!paystackOn && !manualOn && <p className={s.alert}>Payments are paused right now. Try again later.</p>}

        {p.error && (
          <p className={s.alert} role="alert">
            {p.error}
          </p>
        )}
        {p.confirming && (
          <p className={s.okBox} role="status">
            Payment received by Paystack. Confirming it with your account…
          </p>
        )}
        <p className={s.srOnly} aria-live="polite">
          {copied ? "Copied" : ""}
        </p>
      </div>

      <div className={s.actions}>
        {p.onBack && (
          <button type="button" className={s.secondary} onClick={p.onBack}>
            Back
          </button>
        )}
        {method === "paystack" ? (
          <button type="button" className={s.primary} onClick={p.onPaystack} disabled={p.busy || p.confirming || !paystackOn} aria-busy={p.busy || p.confirming}>
            {p.confirming ? "Confirming…" : p.busy ? "Opening Paystack…" : `Pay ${naira(p.total)}`}
          </button>
        ) : (
          <button type="button" className={s.primary} onClick={p.onTransferSent} disabled={p.busy || !manualOn} aria-busy={p.busy}>
            {p.busy ? "Saving…" : `I've sent ${naira(p.total)}`}
          </button>
        )}
      </div>
    </section>
  );
}
