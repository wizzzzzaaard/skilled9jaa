"use client";

import { useSignup } from "@/lib/hooks/useSignup";
import { FlowShell } from "./FlowShell";
import { RoleStep } from "./steps/RoleStep";
import { BasicStep } from "./steps/BasicStep";
import { CheckEmailStep } from "./steps/CheckEmailStep";
import { SetupStep } from "./steps/SetupStep";
import { SkillsStep } from "./steps/SkillsStep";
import { HsServicesStep } from "./steps/HsServicesStep";
import { HsPlanStep } from "./steps/HsPlanStep";
import { PaymentStep } from "./steps/PaymentStep";
import { SuccessStep } from "./steps/SuccessStep";
import s from "./flow.module.css";

export function SignupClient() {
  const f = useSignup();
  const inFlow = !["intro", "check_email", "success", "pending"].includes(f.step);

  return (
    <FlowShell steps={inFlow ? f.steps : undefined} stepIndex={f.stepIndex} right={f.userId ? null : { href: "/login", label: "Log in" }}>
      {f.step === "intro" && <p className={s.loading} role="status">Loading your signup…</p>}
      {f.step === "role" && <RoleStep s={f} />}
      {f.step === "basic" && <BasicStep s={f} />}
      {f.step === "check_email" && <CheckEmailStep email={f.email} />}
      {f.step === "setup" && <SetupStep s={f} />}
      {f.step === "skills" && <SkillsStep s={f} />}
      {f.step === "hs_services" && <HsServicesStep s={f} />}
      {f.step === "hs_plan" && <HsPlanStep s={f} />}
      {f.step === "payment" && <PaymentStep s={f} />}
      {f.step === "success" && <SuccessStep />}
    </FlowShell>
  );
}
