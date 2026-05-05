import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { Profile, ProfileMode } from "@/types/profile";

interface SessionState {
  user: Profile | null;
  session: boolean;
  isLoading: boolean;
  setUser: (user: Profile | null) => void;
  setSession: (session: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
  switchMode: (mode: ProfileMode) => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  user: null,
  session: false,
  isLoading: true,

  setUser: (user) => set({ user, session: !!user }),
  setSession: (session) => set({ session }),
  setIsLoading: (isLoading) => set({ isLoading }),

  refreshUser: async () => {
    const supabase = createClient();
    const { data: { session: authSession } } = await supabase.auth.getSession();
    
    if (!authSession) {
      set({ user: null, session: false, isLoading: false });
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authSession.user.id)
      .single();

    set({ user: profile, session: true, isLoading: false });
  },

  signOut: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ user: null, session: false });
    window.location.href = "/";
  },

  switchMode: async (mode: ProfileMode) => {
    const supabase = createClient();
    const user = get().user;
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ active_mode: mode })
      .eq("id", user.id);

    if (!error) {
      set({ user: { ...user, active_mode: mode } });
    }
  },
}));
