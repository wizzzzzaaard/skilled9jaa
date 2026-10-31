import { Suspense } from "react";
import "@fontsource-variable/bricolage-grotesque/wdth.css";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import { SignupClient } from "@/components/signup/SignupClient";

export const metadata = {
  title: "Create your free account | Skilled9ja",
  description: "Join Skilled9ja free to find work, hire pros and hire staff near you.",
  alternates: { canonical: "/signup" },
};

export default function SignupPage() {
  return (
    <Suspense>
      <SignupClient />
    </Suspense>
  );
}
