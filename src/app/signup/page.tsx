import { Suspense } from "react";
import { SignupClient } from "@/components/signup/SignupClient";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupClient />
    </Suspense>
  );
}