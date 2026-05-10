"use client";

import { Button } from "@/components/ui/Button";
import { Mail, Search, Phone, MapPin } from "lucide-react";

interface Props {
  setStep: (s: any) => void;
  displayPrice: number;
}

const features = [
  {
    icon: <Mail className="w-5 h-5 text-primary" />,
    title: "Job alerts sent to your email",
    desc: "Get notified when clients post jobs matching your skills in your city — before anyone else.",
  },
  {
    icon: <Search className="w-5 h-5 text-primary" />,
    title: "Recommended on Google",
    desc: "Your profile shows up when businesses search for your skills nearby — even while you sleep.",
  },
  {
    icon: <Phone className="w-5 h-5 text-primary" />,
    title: "Businesses call you directly",
    desc: "Companies and individuals reach your phone and WhatsApp straight from your profile — no middleman.",
  },
  {
    icon: <MapPin className="w-5 h-5 text-primary" />,
    title: "Update your location anytime",
    desc: "Moved city? Just update your location and keep getting job calls wherever you are.",
  },
];

export function IntroStep({ setStep, displayPrice }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary leading-tight mb-2">
          Your profile works for you 24/7
        </h2>
        <p className="text-sm text-text-secondary">
          Here's exactly what happens the moment you go live:
        </p>
      </div>

      <div className="space-y-5">
        {features.map((f) => (
          <div key={f.title} className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              {f.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary mb-0.5">{f.title}</p>
              <p className="text-sm text-text-secondary leading-snug">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm text-text-secondary">
        This is a{" "}
        <span className="font-bold text-text-primary">
          one-time payment of ₦{displayPrice.toLocaleString()}
        </span>
        . No monthly fees, no renewals. Your profile stays live for life.
      </div>

      <Button
        variant="primary"
        className="w-full"
        onClick={() => setStep("basic")}
      >
        Set Up My Profile →
      </Button>
    </div>
  );
}