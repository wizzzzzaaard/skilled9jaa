"use client";

import { useEffect } from "react";
import { useSessionStore } from "@/store/sessionStore";

export function SessionInitializer() {
  const refreshUser = useSessionStore((state) => state.refreshUser);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return null;
}
