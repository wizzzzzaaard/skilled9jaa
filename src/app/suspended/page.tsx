"use client";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function SuspendedPage() {
  const router = useRouter();
  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-md w-full text-center">
        <Image
          src="https://vqzvvupwhzjaahfqgron.supabase.co/storage/v1/object/public/skilled-niger-assets/marketplace/1000084258.webp"
          alt="Skilled9ja" width={48} height={48} className="mx-auto mb-8"
        />
        <h1 className="text-xl font-semibold text-text-primary mb-3">Account suspended</h1>
        <p className="text-text-secondary text-sm mb-8">
          Your account has been suspended. Please contact us at{" "}
          <a href="mailto:support@skilled9ja.com" className="text-primary underline">
            support@skilled9ja.com
          </a>{" "}
          if you believe this is a mistake.
        </p>
        <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mx-auto transition-colors">
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
}