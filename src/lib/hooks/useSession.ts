"use client";

import { useEffect } from "react";
import { useSessionStore } from "@/store/sessionStore";

export function useSession() {
  const { user, session, isLoading, refreshUser } = useSessionStore();

  useEffect(() => {
    refreshUser();
  }, []);

  return { user, session, isLoading, refreshUser };
}
