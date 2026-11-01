"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Small admin-wide notices: owner-only redirects, and a nudge to turn on two-step login. */
export function AdminNotices() {
  const pathname = usePathname();
  const [ownerOnly, setOwnerOnly] = useState(false);
  const [noMfa, setNoMfa] = useState(false);
  useEffect(() => {
    setOwnerOnly(new URLSearchParams(window.location.search).get("owner_only") === "1");
  }, [pathname]);
  useEffect(() => {
    createClient().auth.mfa.listFactors().then(({ data, error }) => {
      if (!error) setNoMfa(!(data?.totp ?? []).some((f) => f.status === "verified"));
    });
  }, []);
  if (pathname === "/admin/security") return null;
  if (!ownerOnly && !noMfa) return null;
  return (
    <div className="px-4 sm:px-8 pt-4 space-y-2">
      {ownerOnly && <p className="text-sm font-semibold bg-amber-50 border border-amber-200 rounded-lg px-3 py-2" role="alert">That page is for owner admins only. Ask an owner if you need it.</p>}
      {noMfa && (
        <p className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-2">
          Protect the admin: <Link href="/admin/security" className="font-semibold underline">turn on two-step login</Link>.
        </p>
      )}
    </div>
  );
}
