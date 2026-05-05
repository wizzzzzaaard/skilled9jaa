"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { Clock, Shield, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function PendingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      setEmail(data.user.email || "");
      supabase.from("profiles")
        .select("account_status")
        .eq("id", data.user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile?.account_status === "active") {
            router.push("/dashboard");
          } else {
            setStatus(profile?.account_status || null);
          }
        });
    });

    // Poll every 5 seconds
    const interval = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_status")
        .eq("id", user.id)
        .single();
      if (profile?.account_status === "active") {
        clearInterval(interval);
        router.push("/dashboard");
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  const isPendingManual = status === "pending_manual";

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        <Image
          src="https://vqzvvupwhzjaahfqgron.supabase.co/storage/v1/object/public/skilled-niger-assets/marketplace/1000084258.webp"
          alt="Skilled9ja"
          width={48}
          height={48}
          className="mx-auto mb-8"
        />

        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          {isPendingManual 
            ? <Clock className="w-8 h-8 text-primary" />
            : <Shield className="w-8 h-8 text-primary" />
          }
        </div>

        <h1 className="text-xl font-semibold text-text-primary mb-3">
          {isPendingManual ? "Payment under review" : "Identity verification in progress"}
        </h1>

        <p className="text-text-secondary text-sm mb-8 leading-relaxed">
          {isPendingManual
            ? `We've received your payment submission. Our team is reviewing it and you'll receive an email at ${email} once approved. This usually takes 1–2 business days.`
            : `Our team is reviewing your NIN and photo. You'll receive an email at ${email} once verified. This usually takes 1–2 business days.`
          }
        </p>

        {isPendingManual && (
          <div className="bg-surface rounded-xl p-4 text-left mb-6 text-sm text-text-secondary">
            <p className="font-semibold text-text-primary mb-1">Waiting on your transfer?</p>
            <p>Make sure you used your account reference code as the payment description. Check your email for the bank details we sent you.</p>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-xs text-text-secondary mb-8">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span>Checking status automatically...</span>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mx-auto transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </motion.div>
    </div>
  );
}